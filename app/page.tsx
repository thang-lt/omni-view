"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isRecord, normalizeAgentMarkdown } from "../lib/research-format";
import {
  type ExtractedSourcePacket,
  type SourceAuditArtifact,
  type SourceWarningArtifact,
} from "../application/research/pipeline-artifacts";
import {
  GEMINI_MODEL,
  MAX_LIVE_SOURCES,
  runLiveResearch,
  type GeminiCitation,
  type GeminiAgentOutput,
  type GeminiRequest,
  type GeminiSourceExtraction,
  type SourceIntelligence,
  type LiveResearchResult,
} from "../application/research/run-live-research";
import { ClaimLedger, CoverageMatrix, SourceAuditNotice, SourceWarningPanel, type CoverageRequirementView } from "../components/research-artifacts";
import { buildCoverageGate } from "../application/research/source-intelligence";

type Tab = "report" | "sources" | "log";
type RunStatus = "idle" | "running" | "complete";

type GeminiResearch = LiveResearchResult;
type ResearchHistoryItem = { id: string; topic: string; completedAt: string; result: GeminiResearch; logs: string[] };

const MAX_HISTORY_RUNS = 5;
const HISTORY_STORAGE_KEY = "research-desk:runs:v2";
async function callGemini(apiKey: string, request: GeminiRequest) {
  const response = await fetch("/api/research/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-gemini-api-key": apiKey },
    body: JSON.stringify({
      prompt: request.prompt,
      useSearch: request.useSearch,
      maxOutputTokens: request.maxOutputTokens,
      ...(request.responseSchema ? { responseSchema: request.responseSchema } : {}),
    }),
  });

  const payload = await response.json().catch(() => ({})) as {
    error?: { message?: string };
    sourceExtractions?: GeminiSourceExtraction[];
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
    }>;
  };
  if (!response.ok) throw new Error(payload.error?.message || `Gemini API trả về lỗi ${response.status}`);
  const candidate = payload.candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini không trả về nội dung. Hãy kiểm tra safety settings hoặc thử chủ đề khác.");
  const citations = (candidate?.groundingMetadata?.groundingChunks || [])
    .map((chunk) => chunk.web)
    .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
    .map((web) => ({ title: web.title || new URL(web.uri).hostname, url: web.uri }));
  return { text, citations, sourceExtractions: Array.isArray(payload.sourceExtractions) ? payload.sourceExtractions : [] };
}

function parseCitation(value: unknown): GeminiCitation | null {
  if (!isRecord(value) || typeof value.title !== "string" || typeof value.url !== "string") return null;
  try {
    const url = new URL(value.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return { title: value.title, url: url.toString() };
  } catch {
    return null;
  }
}

const CLAIM_TYPES = new Set(["empirical", "causal", "predictive", "interpretive", "normative"]);
const CLAIM_VERDICTS = new Set(["supported", "mixed", "unsupported", "unresolved"]);
const CONFIDENCE_LEVELS = new Set(["low", "medium", "high"]);
const WARNING_CATEGORIES = new Set(["conflict-of-interest", "selection-bias", "methodology", "factual-reliability", "misinformation-risk", "propaganda-technique", "hostile-language", "political-framing", "recency", "geographic-scope", "provenance"]);
const COVERAGE_CATEGORIES = ["primary", "claimant", "counterparty", "affected", "independent_expert", "local", "counterevidence"] as const;

function safeStrings(value: unknown, limit = 20): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, limit) : [];
}

function parseStoredWarning(value: unknown, sourceExcerpt: string): SourceWarningArtifact | null {
  if (!isRecord(value) || !WARNING_CATEGORIES.has(value.category as string) || typeof value.observableIndicator !== "string" || typeof value.evidenceQuote !== "string" || typeof value.evidenceVerified !== "boolean" || typeof value.confidenceReason !== "string" || typeof value.verificationHint !== "string") return null;
  if (!(value.severity === "info" || value.severity === "low" || value.severity === "medium" || value.severity === "high") || !CONFIDENCE_LEVELS.has(value.confidence as string)) return null;
  return {
    category: value.category as SourceWarningArtifact["category"],
    observableIndicator: value.observableIndicator,
    evidenceQuote: value.evidenceQuote,
    evidenceVerified: value.evidenceQuote.length >= 20 && sourceExcerpt.toLocaleLowerCase().includes(value.evidenceQuote.toLocaleLowerCase()),
    alternativeExplanation: typeof value.alternativeExplanation === "string" ? value.alternativeExplanation : null,
    severity: value.severity,
    confidence: value.confidence as "low" | "medium" | "high",
    confidenceReason: value.confidenceReason,
    verificationHint: value.verificationHint,
    reviewStatus: "machine-only" as const,
  };
}

function parseStoredAudit(value: unknown, source: ExtractedSourcePacket): SourceAuditArtifact | undefined {
  if (!isRecord(value) || typeof value.sourceId !== "string" || typeof value.sourceIndex !== "number" || !Number.isInteger(value.sourceIndex) || typeof value.sourceType !== "string" || typeof value.stance !== "string" || !Array.isArray(value.warnings)) return undefined;
  const warnings = value.warnings.map((warning) => parseStoredWarning(warning, source.excerpt)).filter((warning): warning is NonNullable<typeof warning> => warning !== null).slice(0, 8);
  const coverageTags = source.fullTextStatus === "read" || source.fullTextStatus === "partial"
    ? safeStrings(value.coverageTags, 7).filter((tag) => COVERAGE_CATEGORIES.includes(tag as typeof COVERAGE_CATEGORIES[number])).slice(0, 4)
    : [];
  return { sourceId: value.sourceId, sourceIndex: value.sourceIndex, sourceType: value.sourceType, stance: value.stance, stakeholderGroups: safeStrings(value.stakeholderGroups, 12), coverageTags, warnings };
}

function parseStoredClaim(value: unknown, sources: Map<string, SourceIntelligence>): LiveResearchResult["claims"][number] | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.text !== "string" || !CLAIM_TYPES.has(value.type as string) || !CLAIM_VERDICTS.has(value.verdict as string) || !CONFIDENCE_LEVELS.has(value.confidence as string) || typeof value.confidenceReason !== "string" || !Array.isArray(value.citations)) return null;
  const citations = value.citations.flatMap((citation) => {
    if (!isRecord(citation) || typeof citation.sourceId !== "string" || typeof citation.quote !== "string") return [];
    const source = sources.get(citation.sourceId);
    const quote = citation.quote.trim();
    const characterIndex = source?.excerpt.toLocaleLowerCase().indexOf(quote.toLocaleLowerCase()) ?? -1;
    return source && quote.length > 0 && characterIndex >= 0 ? [{ sourceId: source.id, locator: `${source.locator}, character ${characterIndex}`, quote, evidenceVerified: true as const }] : [];
  }).slice(0, MAX_LIVE_SOURCES);
  return {
    id: value.id,
    text: value.text,
    type: value.type as LiveResearchResult["claims"][number]["type"],
    verdict: value.verdict as LiveResearchResult["claims"][number]["verdict"],
    confidence: value.confidence as "low" | "medium" | "high",
    confidenceReason: value.confidenceReason,
    citations,
    contradictingSourceIds: safeStrings(value.contradictingSourceIds, MAX_LIVE_SOURCES).filter((id) => sources.has(id)),
    unresolvedQuestions: safeStrings(value.unresolvedQuestions, 12),
  };
}

function parseResearch(value: unknown): GeminiResearch | null {
  if (!isRecord(value) || typeof value.report !== "string" || typeof value.model !== "string") return null;
  if (!Array.isArray(value.citations) || !Array.isArray(value.agents) || !Array.isArray(value.sources) || !Array.isArray(value.claims)) return null;
  const citations = value.citations.map(parseCitation).filter((item): item is GeminiCitation => item !== null).slice(0, MAX_LIVE_SOURCES);
  const allowedUrls = new Set(citations.map((citation) => citation.url));
  const agents = value.agents.flatMap((agent): GeminiAgentOutput[] => {
    if (!isRecord(agent) || typeof agent.name !== "string" || typeof agent.role !== "string" || typeof agent.text !== "string" || !Array.isArray(agent.citations)) return [];
    return [{ name: agent.name, role: agent.role, text: normalizeAgentMarkdown(agent.text), citations: agent.citations.map(parseCitation).filter((item): item is GeminiCitation => item !== null).slice(0, MAX_LIVE_SOURCES) }];
  }).slice(0, 5);
  const sources = value.sources.flatMap((source): SourceIntelligence[] => {
    if (!isRecord(source) || typeof source.id !== "string" || typeof source.title !== "string" || typeof source.url !== "string" || typeof source.excerpt !== "string" || typeof source.locator !== "string" || typeof source.familyId !== "string") return [];
    if (!(source.fullTextStatus === "read" || source.fullTextStatus === "partial" || source.fullTextStatus === "metadata-only" || source.fullTextStatus === "inaccessible")) return [];
    try { if (!allowedUrls.has(new URL(source.url).toString())) return []; } catch { return []; }
    const base = { id: source.id, title: source.title, url: source.url, excerpt: source.excerpt.slice(0, 3_000), locator: source.locator, fullTextStatus: source.fullTextStatus } as const;
    const audit = parseStoredAudit(source.audit, base);
    return [{ ...base, familyId: source.familyId, ...(audit?.sourceId === source.id ? { audit } : {}) }];
  }).slice(0, MAX_LIVE_SOURCES);
  const coverage = buildCoverageGate(sources.map((source) => ({ id: source.id, familyId: source.familyId, coverageTags: source.audit?.coverageTags || [] })), { requiredCategories: COVERAGE_CATEGORIES });
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const claims = value.claims.map((claim) => parseStoredClaim(claim, sourcesById)).filter((claim): claim is NonNullable<typeof claim> => claim !== null).slice(0, 12);
  const claimIdsWithoutEvidence = claims.filter((claim) => claim.citations.length === 0).map((claim) => claim.id);
  const citationAudit = {
    complete: claims.length > 0 && claimIdsWithoutEvidence.length === 0,
    materialClaimCount: claims.length,
    citedClaimCount: claims.length - claimIdsWithoutEvidence.length,
    claimIdsWithoutEvidence,
  };
  return {
    report: normalizeAgentMarkdown(value.report),
    model: value.model,
    citations,
    agents,
    sources,
    sourceAuditStatus: sources.length > 0 && sources.every((source) => source.audit) ? "complete" : "incomplete",
    coverage,
    claims,
    citationAudit,
  };
}

function parseResearchHistory(raw: string | null): ResearchHistoryItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): ResearchHistoryItem[] => {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.topic !== "string" || typeof item.completedAt !== "string") return [];
      if (!Number.isFinite(Date.parse(item.completedAt))) return [];
      const result = parseResearch(item.result);
      const logs = Array.isArray(item.logs) ? item.logs.filter((log): log is string => typeof log === "string").slice(0, 20) : [];
      return result ? [{ id: item.id, topic: item.topic, completedAt: item.completedAt, result, logs }] : [];
    }).slice(0, MAX_HISTORY_RUNS);
  } catch {
    return [];
  }
}

function mapGroundedSources(citations: GeminiCitation[], extractions: GeminiSourceExtraction[]): ExtractedSourcePacket[] {
  const extractionByUrl = new Map(extractions.flatMap((source) => typeof source.requestedUrl === "string" ? [[source.requestedUrl, source] as const] : []));
  return citations.map((citation, index): ExtractedSourcePacket => {
    const source = extractionByUrl.get(citation.url);
    const fullTextStatus = source?.status === "read" || source?.status === "partial" || source?.status === "metadata-only" || source?.status === "inaccessible" ? source.status : "inaccessible";
    return {
      id: `S${index + 1}`,
      title: typeof source?.title === "string" && source.title.trim() ? source.title : citation.title,
      url: typeof source?.finalUrl === "string" ? source.finalUrl : citation.url,
      excerpt: typeof source?.excerpt === "string" ? source.excerpt.slice(0, 3_000) : "",
      locator: fullTextStatus === "read" || fullTextStatus === "partial" ? "server-extracted excerpt" : "metadata-only",
      fullTextStatus,
    };
  });
}

const waves = [
  ["Lập phạm vi", "Orchestrator · Query Planner"],
  ["Tìm nguồn đối trọng", "2 chiến lược truy vấn · tối đa 8 URL"],
  ["Đọc & truy nguyên", "Server Extractor · Heuristic cluster · Coverage"],
  ["Trích xuất luận điểm", "Perspective Analyst · Evidence packet"],
  ["Kiểm chứng cảnh báo", "Source Auditor · Warning evidence"],
  ["Phán quyết bằng chứng", "Evidence Judge"],
  ["Kiểm tra citation Claim Ledger", "Claim → quote → locator → source"],
];

function Meter({ value }: { value: number }) {
  return <span className="meter" aria-label={`${value}%`}><i style={{ width: `${value}%` }} /></span>;
}

function provenanceClusterLabel(sources: readonly SourceIntelligence[], familyId: string): string {
  const familyIds = Array.from(new Set(sources.map((source) => source.familyId)));
  const clusterNumber = Math.max(0, familyIds.indexOf(familyId)) + 1;
  const memberCount = sources.filter((source) => source.familyId === familyId).length;
  return `Cụm ${clusterNumber} · ${memberCount} URL`;
}

function MarkdownContent({ children, compact = false }: { children: string; compact?: boolean }) {
  return <div className={`markdown-body ${compact ? "compact" : ""}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{normalizeAgentMarkdown(children)}</ReactMarkdown>
  </div>;
}

export default function Home() {
  const [topic, setTopic] = useState("Tác động của quy định AI đến doanh nghiệp nhỏ");
  const [status, setStatus] = useState<RunStatus>("idle");
  const [phase, setPhase] = useState(-1);
  const [tab, setTab] = useState<Tab>("log");
  const [logs, setLogs] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [geminiResult, setGeminiResult] = useState<GeminiResearch | null>(null);
  const [geminiError, setGeminiError] = useState("");
  const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const logsRef = useRef<string[]>([]);

  const progress = status === "complete" ? 100 : Math.max(0, Math.round(((phase + 0.35) / waves.length) * 100));

  function replaceLogs(nextLogs: string[]) {
    const limitedLogs = nextLogs.slice(0, 20);
    logsRef.current = limitedLogs;
    setLogs(limitedLogs);
  }

  function prependLogs(...entries: string[]) {
    replaceLogs([...entries, ...logsRef.current]);
  }

  useEffect(() => {
    try {
      const sessionKey = sessionStorage.getItem("research-desk:gemini-key") || "";
      // Storage is browser-only, so persisted client state is intentionally hydrated after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setApiKey(sessionKey);
      setKeyDraft(sessionKey);
      const saved = localStorage.getItem("research-desk:v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.topic === "string") setTopic(parsed.topic);
      }
      setHistory(parseResearchHistory(localStorage.getItem(HISTORY_STORAGE_KEY)));
    } catch { /* corrupted local state is ignored */ }
    finally { setHistoryReady(true); }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("research-desk:v1", JSON.stringify({ topic })); } catch { /* quota or privacy mode */ }
  }, [topic]);

  useEffect(() => {
    if (!historyReady) return;
    try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_RUNS))); } catch { /* quota or privacy mode */ }
  }, [history, historyReady]);

  function startResearch() {
    const clean = topic.trim();
    if (clean.length < 8) return;
    if (!apiKey) {
      setGeminiError("Cần kết nối Gemini API trước khi bắt đầu. Ứng dụng không sử dụng dữ liệu mẫu.");
      setSettingsOpen(true);
      return;
    }
    void runGeminiResearch(clean);
  }

  async function runGeminiResearch(clean: string) {
    setStatus("running");
    setPhase(0);
    setTab("log");
    setGeminiResult(null);
    setGeminiError("");
    replaceLogs(["Orchestrator · Tạo Research Brief live cho “" + clean + "”"]);

    try {
      const { result } = await runLiveResearch(clean, {
        callGemini: (request) => callGemini(apiKey, request),
        extractSources: async (citations, extractions) => mapGroundedSources(citations, extractions),
        setPhase,
        log: (...entries) => prependLogs(...entries),
      });
      const completedLogs = logsRef.current.slice(0, 20);
      setGeminiResult(result);
      setHistory((current) => [{
        id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
        topic: clean,
        completedAt: new Date().toISOString(),
        result,
        logs: completedLogs,
      }, ...current].slice(0, MAX_HISTORY_RUNS));
      setPhase(6);
      setStatus("complete");
      setTab("report");
      replaceLogs(completedLogs);
    } catch (error) {
      setStatus("idle");
      setGeminiError(error instanceof Error ? error.message : "Không thể hoàn tất nghiên cứu Gemini.");
      prependLogs("Orchestrator · Phiên live dừng vì lỗi kết nối hoặc API");
    }
  }

  function saveApiKey() {
    const clean = keyDraft.trim();
    if (clean.length < 20) {
      setGeminiError("API key có vẻ chưa đầy đủ.");
      return;
    }
    sessionStorage.setItem("research-desk:gemini-key", clean);
    setApiKey(clean);
    setGeminiError("");
    setSettingsOpen(false);
  }

  function clearApiKey() {
    sessionStorage.removeItem("research-desk:gemini-key");
    setApiKey("");
    setKeyDraft("");
    setGeminiResult(null);
    setStatus("idle");
    setPhase(-1);
    replaceLogs([]);
    setGeminiError("");
    setSettingsOpen(false);
  }

  function openHistoryItem(item: ResearchHistoryItem) {
    setTopic(item.topic);
    setGeminiResult(item.result);
    setStatus("complete");
    setPhase(6);
    setTab("report");
    setGeminiError("");
    replaceLogs(item.logs.length > 0 ? item.logs : [`Lịch sử · Phiên này được lưu trước khi tính năng lưu nhật ký được bổ sung (${new Date(item.completedAt).toLocaleString("vi-VN")})`]);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">ĐC</span><span><b>ĐA CHIỀU</b><small>RESEARCH DESK</small></span></div>
        <div className="session"><span className={`status-dot ${status}`} /> {status === "idle" ? "Chờ kết nối và câu hỏi" : status === "complete" ? "Nghiên cứu hoàn tất" : `Wave ${phase + 1} đang chạy`}</div>
        <div className="topbar-actions"><button className={`connection-button ${apiKey ? "connected" : ""}`} onClick={() => setSettingsOpen(true)}><i />{apiKey ? "Gemini đã kết nối" : "Kết nối Gemini"}</button><button className="quiet-button" onClick={() => window.print()} disabled={!geminiResult}>Xuất báo cáo</button></div>
      </header>

      <section className={`live-banner ${apiKey ? "connected" : ""}`}><b>Live only · Không dữ liệu mẫu</b><span>{apiKey ? `Tối đa ${MAX_LIVE_SOURCES} nguồn thật · ${GEMINI_MODEL} · thinking minimal.` : "Kết nối Gemini để bắt đầu; ứng dụng không tạo nguồn hoặc kết luận giả khi chưa có dữ liệu web."}</span></section>

      <div className="research-layout">
        <aside className="pipeline-panel">
          <div className="panel-heading"><span>Đội nghiên cứu</span><em>{status === "running" ? "Đang hoạt động" : "7 wave"}</em></div>
          <div className="wave-list">
            {waves.map(([name, agents], index) => {
              const waveState = status === "complete" || index < phase ? "done" : index === phase && status !== "idle" ? "active" : "waiting";
              return <button key={name} className={`wave ${waveState}`} onClick={() => setTab(geminiResult ? "report" : "log")}>
                <span className="wave-number">{waveState === "done" ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <span><b>{name}</b><small>{agents}</small></span>
              </button>;
            })}
          </div>
          <div className="pipeline-note">
            <span>Tiến độ phiên</span><b>{progress}%</b><Meter value={progress} />
          </div>
        </aside>

        <section className="workspace">
          <div className="composer">
            <div className="eyebrow">CÂU HỎI NGHIÊN CỨU</div>
            <div className="composer-row">
              <textarea value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={180} aria-label="Chủ đề nghiên cứu" />
              <button className="primary-button" onClick={startResearch} disabled={topic.trim().length < 8 || status === "running"}>Bắt đầu <span>→</span></button>
            </div>
            <div className="composer-options">
              <span>Chế độ</span><span className="scope-chip">Live only</span><span className="scope-chip">Tối đa 8 URL · gom cụm sơ bộ</span><span className="scope-chip">Warning có evidence</span><span className="scope-chip">VI · EN</span>
            </div>
            {geminiError && <div className="api-error" role="alert"><b>Không thể chạy Gemini</b><span>{geminiError}</span><button onClick={() => setSettingsOpen(true)}>Kiểm tra key</button></div>}
          </div>

          {status !== "idle" || geminiResult ? <>
            <div className={`run-ribbon ${status}`}>
              <span>{status === "complete" ? "✓" : "●"}</span>
              <div><b>{status === "complete" ? "Nghiên cứu có grounding và kiểm tra citation Claim Ledger đã hoàn tất" : `${waves[phase]?.[0] || "Đang chuẩn bị"}`}</b><small>{status === "complete" && geminiResult ? `${geminiResult.citations.length} URL · ${new Set(geminiResult.sources.map((source) => source.familyId)).size} cụm nguồn sơ bộ · audit ${geminiResult.sourceAuditStatus}` : waves[phase]?.[1]}</small></div>
              <Meter value={progress} />
            </div>
            <nav className="tabs" aria-label="Kết quả nghiên cứu">
              {(geminiResult ? ([['report','Báo cáo live'],['sources',`Nguồn grounding ${geminiResult.citations.length}`],['log','Nhật ký agents']] as [Tab,string][]) : ([['log','Nhật ký agents']] as [Tab,string][])).map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}
            </nav>

            {tab === "report" && geminiResult && <div className="live-report view-stack">
              <CoverageMatrix entries={Object.values(geminiResult.coverage.matrix).map((cell) => ({ requirement: ({ primary: "primary-source", claimant: "claimant", counterparty: "counterparty", affected: "affected-group", independent_expert: "independent-expert", local: "local-perspective", counterevidence: "direct-counterevidence" } as Record<string, CoverageRequirementView>)[cell.category], sourceIds: cell.sourceIds })).filter((entry) => Boolean(entry.requirement))} coverageRatio={(7 - geminiResult.coverage.missingCategories.length) / 7} complete={geminiResult.coverage.passed} auditComplete={geminiResult.sourceAuditStatus === "complete"} />
              <section className="content-card report-paper"><div className="section-title"><div><span className="eyebrow">EVIDENCE JUDGE · {geminiResult.model}</span><h2>Báo cáo nghiên cứu có Google Search grounding</h2></div><small>{geminiResult.citationAudit.complete ? "Claim Ledger citation check đạt" : `${geminiResult.citationAudit.claimIdsWithoutEvidence.length} claim còn thiếu quote kiểm chứng`}</small></div><MarkdownContent>{geminiResult.report}</MarkdownContent></section>
              <ClaimLedger claims={geminiResult.claims.map((claim) => ({ ...claim, supportingEvidenceIds: claim.citations.map((citation) => `${citation.sourceId}:${citation.locator}`), contradictingEvidenceIds: claim.contradictingSourceIds }))} />
              <section className="content-card"><div className="section-title"><div><span className="eyebrow">ANALYSIS ROLES</span><h2>Các vai trò phân tích</h2></div><small>Khác vai trò không đồng nghĩa độc lập model hoặc độc lập dữ liệu.</small></div><div className="agent-output-grid">{geminiResult.agents.map((agent) => <details key={agent.name}><summary><span><b>{agent.name}</b><small>{agent.role}</small></span><em>{agent.citations.length} URL trong tập làm việc</em></summary><div><MarkdownContent compact>{normalizeAgentMarkdown(agent.text)}</MarkdownContent></div></details>)}</div></section>
            </div>}

            {tab === "sources" && geminiResult && <div className="view-stack">
              <section className="content-card"><div className="section-title"><div><span className="eyebrow">PROVENANCE REGISTRY</span><h2>Nguồn và cụm provenance sơ bộ</h2></div><small>{geminiResult.sources.length} URL · {new Set(geminiResult.sources.map((source) => source.familyId)).size} cụm heuristic · audit {geminiResult.sourceAuditStatus}</small></div><div className="grounded-source-list">{geminiResult.sources.map((source,index) => <article className="source-entry" key={source.id}><a href={source.url} target="_blank" rel="noreferrer" title={`Mở nguồn: ${source.title}`}><span>{String(index+1).padStart(2,"0")}</span><div><b>{source.title}</b><small>{source.url}</small></div><em>{source.fullTextStatus} · {provenanceClusterLabel(geminiResult.sources, source.familyId)}</em></a></article>)}</div></section>
              <SourceAuditNotice />
              {geminiResult.sources.map((source) => <SourceWarningPanel key={source.id} source={{ id: source.id, title: source.title, publisher: (() => { try { return new URL(source.url).hostname; } catch { return "Không rõ publisher"; } })(), url: source.url, fullTextStatus: source.fullTextStatus }} warnings={(source.audit?.warnings || []).map((warning, index) => ({ id: `${source.id}-W${index + 1}`, category: warning.category, observableIndicator: warning.observableIndicator, evidenceIds: warning.evidenceVerified ? [`${source.id}:${source.locator}`] : [], evidenceQuote: warning.evidenceVerified ? warning.evidenceQuote : undefined, alternativeExplanation: warning.alternativeExplanation, severity: warning.severity, confidence: warning.confidence, confidenceReason: warning.confidenceReason, status: warning.reviewStatus }))} />)}
            </div>}

            {tab === "log" && <section className="content-card log-list"><div className="section-title"><div><span className="eyebrow">APPEND-ONLY LOG</span><h2>Nhật ký điều phối</h2></div></div>{logs.map((log,index) => <div key={`${log}-${index}`}><span>{String(logs.length-index).padStart(2,"0")}</span><p>{log}</p><small>{index === 0 ? "vừa xong" : `${index + 1} bước trước`}</small></div>)}</section>}
          </> : <section className="empty-hero"><span className="eyebrow">LIVE MULTI-AGENT RESEARCH</span><h1>Một sự kiện. Nhiều nguồn.<br />Ít điểm mù hơn.</h1><p>Kết nối Gemini, sau đó nhập chủ đề để tìm nguồn web thật, bóc tách luận điểm và kiểm định đối kháng. Ứng dụng không dùng nguồn hoặc kết luận mẫu.</p><div className="prompt-examples">{["Ảnh hưởng của AI đến thị trường lao động", "Một chính sách công đang gây tranh luận", "Kiểm chứng một tuyên bố đang lan truyền"].map((example) => <button key={example} onClick={() => setTopic(example)}>{example} ↗</button>)}</div></section>}
        </section>

        <aside className="inspector-panel">
          <div className="panel-heading"><span>Lịch sử nghiên cứu</span><em>{history.length}/{MAX_HISTORY_RUNS} phiên</em></div>
          <div className="history-inspector">
            <div className="history-policy"><b>{geminiResult ? `${geminiResult.citations.length} URL · ${new Set(geminiResult.sources.map((source) => source.familyId)).size} cụm nguồn sơ bộ` : "Evidence policy · Live only"}</b><p>Warning phải có evidence trích xuất; độ chắc warning không phải độ tin cậy tổng thể của nguồn. API key không nằm trong lịch sử.</p></div>
            {history.length > 0 ? <div className="history-list">{history.map((item) => <button key={item.id} className="history-item" onClick={() => openHistoryItem(item)}>
              <b>{item.topic}</b>
              <span>{new Date(item.completedAt).toLocaleString("vi-VN")}</span>
              <small>{item.result.citations.length} nguồn · {item.logs.length} nhật ký · {item.result.model}</small>
            </button>)}</div> : <div className="history-empty"><span className="inspect-orbit">◎</span><b>Chưa có phiên hoàn tất</b><p>Mỗi báo cáo live hoàn tất sẽ tự động xuất hiện tại đây và được giữ lại sau khi refresh.</p></div>}
          </div>
        </aside>
      </div>
      {settingsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
        <section className="key-modal" role="dialog" aria-modal="true" aria-labelledby="gemini-key-title">
          <button className="modal-close" onClick={() => setSettingsOpen(false)} aria-label="Đóng">×</button>
          <span className="eyebrow">BRING YOUR OWN KEY</span>
          <h2 id="gemini-key-title">Kết nối Gemini API</h2>
          <p>Key được gửi qua research gateway cùng origin rồi chuyển tiếp tới Gemini cho từng request; gateway không lưu key. Browser chỉ giữ key trong <code>sessionStorage</code>; đóng tab sẽ kết thúc phiên lưu.</p>
          <label htmlFor="gemini-key">Gemini API key</label>
          <div className="key-input-row"><input id="gemini-key" type={showKey ? "text" : "password"} value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} placeholder="AIza…" autoComplete="off" spellCheck={false} /><button onClick={() => setShowKey((value) => !value)}>{showKey ? "Ẩn" : "Hiện"}</button></div>
          {geminiError && <p className="modal-error" role="alert">{geminiError}</p>}
          <div className="security-note"><b>Khuyến nghị bảo mật</b><span>Dùng key riêng cho thử nghiệm, đặt quota và giới hạn key cho Generative Language API. Không dùng key production có quyền rộng.</span></div>
          <div className="key-actions">{apiKey && <button className="danger-button" onClick={clearApiKey}>Xóa key khỏi phiên</button>}<button className="primary-button" onClick={saveApiKey}>Lưu cho phiên này</button></div>
          <small className="api-reference">Model: {GEMINI_MODEL} · Google Search grounding · REST generateContent</small>
        </section>
      </div>}
    </main>
  );
}
