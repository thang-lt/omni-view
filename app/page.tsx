"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isRecord, normalizeAgentMarkdown } from "../lib/research-format";
import {
  type ExtractedSourcePacket,
  locateEvidenceQuote,
  type SourceAuditArtifact,
  type SourceWarningArtifact,
} from "../application/research/pipeline-artifacts";
import {
  GEMINI_MODEL,
  MAX_LIVE_SOURCES,
  mapGroundedSources,
  runLiveResearch,
  type GeminiCitation,
  type GeminiAgentOutput,
  type GeminiRequest,
  type GeminiSourceExtraction,
  type SourceIntelligence,
  type SourceProviderProfile,
  type LiveResearchResult,
} from "../application/research/run-live-research";
import { ClaimLedger, SourceAuditNotice, SourceWarningPanel } from "../components/research-artifacts";

type Tab = "report" | "sources" | "log";
type RunStatus = "idle" | "running" | "complete";

type GeminiResearch = LiveResearchResult;
type ResearchHistoryItem = { id: string; topic: string; completedAt: string; result: GeminiResearch; logs: string[] };

const MAX_HISTORY_RUNS = 5;
const HISTORY_STORAGE_KEY = "research-desk:runs:v2";
const GEMINI_DEBUG_LOGS = process.env.NODE_ENV === "development";

function printGeminiDebug(operation: GeminiRequest["operation"], stage: "REQUEST" | "RESPONSE" | "ERROR", value: unknown) {
  if (!GEMINI_DEBUG_LOGS) return;
  const label = `[Gemini][${operation}][${stage}]`;
  if (stage === "ERROR") {
    console.error(label, value);
    return;
  }
  console.groupCollapsed(label);
  console.log(value);
  console.groupEnd();
}

async function callGemini(apiKey: string, request: GeminiRequest) {
  printGeminiDebug(request.operation, "REQUEST", {
    prompt: request.prompt,
    useSearch: request.useSearch,
    extractSources: request.extractSources,
    maxOutputTokens: request.maxOutputTokens,
    responseSchema: request.responseSchema,
  });

  try {
    const response = await fetch("/api/research/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-gemini-api-key": apiKey },
      body: JSON.stringify({
        operation: request.operation,
        prompt: request.prompt,
        useSearch: request.useSearch,
        ...(typeof request.extractSources === "boolean" ? { extractSources: request.extractSources } : {}),
        maxOutputTokens: request.maxOutputTokens,
        ...(request.responseSchema ? { responseSchema: request.responseSchema } : {}),
      }),
    });

    const payload = await response.json().catch(() => ({})) as {
      error?: { message?: string };
      promptFeedback?: { blockReason?: string };
      sourceExtractions?: GeminiSourceExtraction[];
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
        groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
      }>;
    };
    printGeminiDebug(request.operation, "RESPONSE", { httpStatus: response.status, payload });
    const operationLabel = ({
      "balanced-scout": "Balanced Source Scout",
      "counter-scout": "Counter-evidence Scout",
      perspective: "Perspective Analyst",
      "provider-verification": "Provider Verification",
      audit: "Source Warning Auditor",
      "judge-claims": "Evidence Judge · Claim Ledger",
      "judge-report": "Evidence Judge · Report",
    } as Record<GeminiRequest["operation"], string>)[request.operation];
    if (!response.ok) throw new Error(`${operationLabel}: ${payload.error?.message || `Gemini API trả về lỗi ${response.status}`}`);
    const candidate = payload.candidates?.[0];
    const text = candidate?.content?.parts?.map((part) => part.text || "").join("\n").trim();
    if (!text) {
      const reason = candidate?.finishReason || payload.promptFeedback?.blockReason;
      throw new Error(`${operationLabel}: Gemini không trả về nội dung${reason ? ` (${reason})` : ""}.`);
    }
    const citations = (candidate?.groundingMetadata?.groundingChunks || [])
      .map((chunk) => chunk.web)
      .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
      .map((web) => ({ title: web.title || new URL(web.uri).hostname, url: web.uri }));
    return { text, citations, sourceExtractions: Array.isArray(payload.sourceExtractions) ? payload.sourceExtractions : [] };
  } catch (error) {
    printGeminiDebug(request.operation, "ERROR", error);
    throw error;
  }
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
const REPUTATION_ASSESSMENTS = new Set(["established", "mixed", "limited-evidence", "unknown"]);

function safeStrings(value: unknown, limit = 20): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, limit) : [];
}

function parseStoredWarning(value: unknown, source: ExtractedSourcePacket): SourceWarningArtifact | null {
  if (!isRecord(value) || !WARNING_CATEGORIES.has(value.category as string) || typeof value.observableIndicator !== "string" || typeof value.evidenceQuote !== "string" || typeof value.evidenceVerified !== "boolean" || typeof value.confidenceReason !== "string" || typeof value.verificationHint !== "string") return null;
  if (!(value.severity === "info" || value.severity === "low" || value.severity === "medium" || value.severity === "high") || !CONFIDENCE_LEVELS.has(value.confidence as string)) return null;
  const locatedEvidence = locateEvidenceQuote(source, value.evidenceQuote, 20);
  const evidenceVerified = Boolean(locatedEvidence);
  return {
    category: value.category as SourceWarningArtifact["category"],
    observableIndicator: value.observableIndicator,
    evidenceQuote: value.evidenceQuote,
    evidenceVerified,
    ...(locatedEvidence ? { evidenceLocator: locatedEvidence.locator, evidenceProvenance: locatedEvidence.provenance } : {}),
    alternativeExplanation: typeof value.alternativeExplanation === "string" ? value.alternativeExplanation : null,
    severity: evidenceVerified ? value.severity : "info",
    confidence: evidenceVerified ? value.confidence as "low" | "medium" | "high" : "low",
    confidenceReason: evidenceVerified ? value.confidenceReason : "Không tìm thấy nguyên văn bằng chứng trong evidence passages đã lưu; cần kiểm tra thủ công.",
    verificationHint: value.verificationHint,
    reviewStatus: "machine-only" as const,
  };
}

function parseStoredAudit(value: unknown, source: ExtractedSourcePacket): SourceAuditArtifact | undefined {
  if (!isRecord(value) || typeof value.sourceId !== "string" || typeof value.sourceIndex !== "number" || !Number.isInteger(value.sourceIndex) || typeof value.sourceType !== "string" || typeof value.stance !== "string" || !Array.isArray(value.warnings)) return undefined;
  const warnings = value.warnings.map((warning) => parseStoredWarning(warning, source)).filter((warning): warning is NonNullable<typeof warning> => warning !== null).slice(0, 8);
  return { sourceId: value.sourceId, sourceIndex: value.sourceIndex, sourceType: value.sourceType, stance: value.stance, stakeholderGroups: safeStrings(value.stakeholderGroups, 12), warnings };
}

function parseStoredClaim(value: unknown, sources: Map<string, SourceIntelligence>): LiveResearchResult["claims"][number] | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.text !== "string" || !CLAIM_TYPES.has(value.type as string) || !CLAIM_VERDICTS.has(value.verdict as string) || !CONFIDENCE_LEVELS.has(value.confidence as string) || typeof value.confidenceReason !== "string" || !Array.isArray(value.citations)) return null;
  const citations = value.citations.flatMap((citation) => {
    if (!isRecord(citation) || typeof citation.sourceId !== "string" || typeof citation.quote !== "string") return [];
    const source = sources.get(citation.sourceId);
    const locatedEvidence = source ? locateEvidenceQuote(source, citation.quote, 20) : null;
    const relationship = citation.relationship === "contradicts" || citation.relationship === "context" ? citation.relationship : "supports";
    return source && locatedEvidence ? [{
      relationship,
      sourceId: source.id,
      locator: locatedEvidence.locator,
      quote: locatedEvidence.quote,
      textMatchVerified: true as const,
      provenance: locatedEvidence.provenance,
    }] : [];
  }).slice(0, MAX_LIVE_SOURCES);
  const requestedVerdict = value.verdict as LiveResearchResult["claims"][number]["verdict"];
  const hasSupport = citations.some((citation) => citation.relationship === "supports");
  const hasContradiction = citations.some((citation) => citation.relationship === "contradicts");
  const verdictHasRequiredEvidence = requestedVerdict === "unresolved"
    || (requestedVerdict === "supported" && hasSupport)
    || (requestedVerdict === "unsupported" && hasContradiction)
    || (requestedVerdict === "mixed" && hasSupport && hasContradiction);
  const substantiveEvidence = citations.filter((citation) => citation.relationship !== "context");
  const groundedOnly = substantiveEvidence.length > 0 && substantiveEvidence.every((citation) => citation.provenance === "grounding-support");
  const requestedConfidence = value.confidence as "low" | "medium" | "high";
  const confidenceReason = !verdictHasRequiredEvidence
    ? `${value.confidenceReason} Verdict được hạ về unresolved khi hydrate vì thiếu evidence link hợp lệ.`
    : groundedOnly && requestedConfidence === "high"
      ? `${value.confidenceReason} Confidence được giới hạn ở medium vì chỉ có grounding-support model-generated.`
      : value.confidenceReason;
  return {
    id: value.id,
    text: value.text,
    type: value.type as LiveResearchResult["claims"][number]["type"],
    verdict: verdictHasRequiredEvidence ? requestedVerdict : "unresolved",
    confidence: !verdictHasRequiredEvidence ? "low" : groundedOnly && requestedConfidence === "high" ? "medium" : requestedConfidence,
    confidenceReason,
    citations,
    contradictingSourceIds: Array.from(new Set(citations.filter((citation) => citation.relationship === "contradicts").map((citation) => citation.sourceId))),
    unresolvedQuestions: safeStrings(value.unresolvedQuestions, 12),
  };
}

function parseStoredProvider(value: unknown, knownSourceIds: Set<string>): SourceProviderProfile | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.domain !== "string") return null;
  const sourceIds = safeStrings(value.sourceIds, MAX_LIVE_SOURCES).filter((sourceId) => knownSourceIds.has(sourceId));
  const discoveredBy = safeStrings(value.discoveredBy, 2).filter((role): role is "balanced-scout" | "counter-scout" => role === "balanced-scout" || role === "counter-scout");
  const assessmentValue = value.assessment;
  const assessment = isRecord(assessmentValue) && assessmentValue.providerId === value.id && REPUTATION_ASSESSMENTS.has(assessmentValue.reputationAssessment as string)
    ? {
        providerId: value.id,
        providerName: value.name,
        reputationAssessment: assessmentValue.reputationAssessment as "established" | "mixed" | "limited-evidence" | "unknown",
        politicalOrientation: typeof assessmentValue.politicalOrientation === "string" ? assessmentValue.politicalOrientation : "Chưa xác định đủ bằng chứng",
        ownershipAndAffiliations: safeStrings(assessmentValue.ownershipAndAffiliations, 8),
        reputationSignals: safeStrings(assessmentValue.reputationSignals, 8),
        caveats: safeStrings(assessmentValue.caveats, 8),
        verificationCitations: Array.isArray(assessmentValue.verificationCitations) ? assessmentValue.verificationCitations.map(parseCitation).filter((citation): citation is GeminiCitation => citation !== null).slice(0, 8) : [],
        reviewStatus: "machine-only" as const,
      }
    : undefined;
  return { id: value.id, name: value.name, domain: value.domain, sourceIds, discoveredBy, ...(assessment ? { assessment } : {}) };
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
    if (!(source.fullTextStatus === "read" || source.fullTextStatus === "partial" || source.fullTextStatus === "grounded-support" || source.fullTextStatus === "metadata-only" || source.fullTextStatus === "inaccessible")) return [];
    try { if (!allowedUrls.has(new URL(source.url).toString())) return []; } catch { return []; }
    const evidencePassages = Array.isArray(source.evidencePassages) ? source.evidencePassages.flatMap((passage) => {
      if (!isRecord(passage) || !(passage.kind === "direct" || passage.kind === "grounding-support") || typeof passage.text !== "string" || typeof passage.locator !== "string" || !passage.text.trim()) return [];
      return [{ kind: passage.kind, text: passage.text.slice(0, 3_000), locator: passage.locator }];
    }).slice(0, 2) : undefined;
    const base = { id: source.id, title: source.title, url: source.url, excerpt: source.excerpt.slice(0, 3_000), locator: source.locator, fullTextStatus: source.fullTextStatus, ...(evidencePassages?.length ? { evidencePassages } : {}) } as const;
    const audit = parseStoredAudit(source.audit, base);
    return [{ ...base, familyId: source.familyId, ...(audit?.sourceId === source.id ? { audit } : {}) }];
  }).slice(0, MAX_LIVE_SOURCES);
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const knownSourceIds = new Set(sourcesById.keys());
  const sourceProviders = Array.isArray(value.sourceProviders)
    ? value.sourceProviders.map((provider) => parseStoredProvider(provider, knownSourceIds)).filter((provider): provider is SourceProviderProfile => provider !== null).slice(0, MAX_LIVE_SOURCES)
    : [];
  const seenClaimIds = new Set<string>();
  const claims = value.claims.map((claim) => parseStoredClaim(claim, sourcesById)).filter((claim): claim is NonNullable<typeof claim> => {
    if (!claim || !claim.id.trim() || !claim.text.trim() || seenClaimIds.has(claim.id)) return false;
    seenClaimIds.add(claim.id);
    return true;
  }).slice(0, 6);
  const claimIdsWithoutEvidence = claims.filter((claim) => claim.verdict !== "unresolved" && claim.citations.every((citation) => citation.relationship === "context")).map((claim) => claim.id);
  const citedClaimCount = claims.filter((claim) => claim.citations.some((citation) => citation.relationship !== "context")).length;
  const citationAudit = {
    complete: claims.length > 0 && claimIdsWithoutEvidence.length === 0,
    materialClaimCount: claims.length,
    citedClaimCount,
    claimIdsWithoutEvidence,
  };
  return {
    report: normalizeAgentMarkdown(value.report),
    model: value.model,
    citations,
    agents,
    sources,
    sourceProviders,
    sourceAuditStatus: sources.length > 0 && sources.every((source) => source.audit) && sourceProviders.every((provider) => provider.assessment) ? "complete" : "incomplete",
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

const waves = [
  ["Lập phạm vi", "Orchestrator · Query Planner"],
  ["Tìm nguồn đối trọng", "2 chiến lược truy vấn · tối đa 8 URL"],
  ["Đọc & truy nguyên", "Server Extractor · Heuristic cluster"],
  ["Trích xuất luận điểm", "Perspective Analyst · Evidence packet"],
  ["Kiểm chứng cảnh báo", "Source Auditor · Provider verification + warning evidence"],
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

function ProviderAndSourceAudit({ research }: { research: GeminiResearch }) {
  const sourcesById = new Map(research.sources.map((source) => [source.id, source]));
  const assignedSourceIds = new Set(research.sourceProviders.flatMap((provider) => provider.sourceIds));
  const unassignedSources = research.sources.filter((source) => !assignedSourceIds.has(source.id));

  function sourceAuditPanel(source: SourceIntelligence) {
    let publisher = "Không rõ publisher";
    try { publisher = new URL(source.url).hostname; } catch { /* URL đã được validate trước khi render */ }
    return <SourceWarningPanel
      key={source.id}
      source={{
        id: source.id,
        title: source.title,
        publisher,
        url: source.url,
        fullTextStatus: source.fullTextStatus,
        ...(source.audit ? {
          sourceType: source.audit.sourceType,
          stance: source.audit.stance,
          stakeholderGroups: source.audit.stakeholderGroups,
        } : {}),
      }}
      warnings={(source.audit?.warnings || []).map((warning, index) => ({
        id: `${source.id}-W${index + 1}`,
        category: warning.category,
        observableIndicator: warning.observableIndicator,
        evidenceIds: warning.evidenceVerified ? [`${source.id}:${warning.evidenceLocator || source.locator}`] : [],
        evidenceQuote: warning.evidenceVerified ? warning.evidenceQuote : undefined,
        evidenceProvenance: warning.evidenceVerified ? warning.evidenceProvenance : undefined,
        alternativeExplanation: warning.alternativeExplanation,
        severity: warning.severity,
        confidence: warning.confidence,
        confidenceReason: warning.confidenceReason,
        status: warning.reviewStatus,
      }))}
    />;
  }

  return <section className="content-card provider-source-audit" aria-labelledby="provider-source-audit-title">
    <div className="section-title">
      <div><span className="eyebrow">PROVIDER REGISTRY + SOURCE AUDIT</span><h2 id="provider-source-audit-title">Đơn vị cung cấp và cảnh báo nguồn</h2></div>
      <small>{research.sourceProviders.length} đơn vị · {research.sources.length} nguồn · audit {research.sourceAuditStatus}</small>
    </div>
    <SourceAuditNotice />
    <div className="agent-output-grid provider-audit-list">
      {research.sourceProviders.map((provider) => {
        const providerSources = Array.from(new Set(provider.sourceIds)).flatMap((sourceId) => {
          const source = sourcesById.get(sourceId);
          return source ? [source] : [];
        });
        const warningCount = providerSources.reduce((count, source) => count + (source.audit?.warnings.length || 0), 0);
        return <details key={provider.id}>
          <summary>
            <span><b>{provider.name}</b><small>{provider.domain} · {providerSources.length} nguồn · {warningCount} warning</small></span>
            <em>{provider.assessment?.reputationAssessment || "chưa đánh giá"}</em>
          </summary>
          <div className="provider-audit-body">
            <div className="provider-profile">
              <p><b>Được phát hiện bởi:</b> {provider.discoveredBy.join(" + ") || "Không rõ scout"}</p>
              <p><b>Thiên hướng chính trị/biên tập:</b> {provider.assessment?.politicalOrientation || "Chưa xác định đủ bằng chứng"}</p>
              <p><b>Ownership/affiliation:</b> {provider.assessment?.ownershipAndAffiliations.join("; ") || "Chưa có dữ liệu"}</p>
              <p><b>Reputation signals:</b> {provider.assessment?.reputationSignals.join("; ") || "Chưa có dữ liệu"}</p>
              {provider.assessment?.caveats.length ? <p><b>Caveat:</b> {provider.assessment.caveats.join("; ")}</p> : null}
              {provider.assessment?.verificationCitations.length ? <p><b>Nguồn kiểm tra provider:</b> {provider.assessment.verificationCitations.map((citation, index) => <span key={`${citation.url}-${index}`}> {index > 0 ? " · " : ""}<a href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a></span>)}</p> : null}
            </div>
            <div className="provider-source-list">
              {providerSources.length ? providerSources.map(sourceAuditPanel) : <div className="empty-state">Provider này chưa liên kết với nguồn hợp lệ trong phiên.</div>}
            </div>
          </div>
        </details>;
      })}
      {unassignedSources.length > 0 && <details>
        <summary><span><b>Nguồn chưa gán provider</b><small>{unassignedSources.length} nguồn vẫn giữ nguyên audit</small></span><em>cần kiểm tra</em></summary>
        <div className="provider-audit-body"><div className="provider-source-list">{unassignedSources.map(sourceAuditPanel)}</div></div>
      </details>}
      {research.sourceProviders.length === 0 && unassignedSources.length === 0 ? <div className="empty-state">Chưa có Provider Registry hoặc Source Audit.</div> : null}
    </div>
  </section>;
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
      const result = await runLiveResearch(clean, {
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
              <section className="content-card report-paper"><div className="section-title"><div><span className="eyebrow">EVIDENCE JUDGE · {geminiResult.model}</span><h2>Báo cáo nghiên cứu có Google Search grounding</h2></div><small>{geminiResult.citationAudit.complete ? "Claim Ledger đã kiểm tra · report là phần diễn giải" : `${geminiResult.citationAudit.claimIdsWithoutEvidence.length} claim đã kết luận còn thiếu quote kiểm chứng`}</small></div><MarkdownContent>{geminiResult.report}</MarkdownContent></section>
              <ClaimLedger claims={geminiResult.claims.map((claim) => ({
                ...claim,
                supportingEvidenceIds: claim.citations.filter((citation) => citation.relationship === "supports").map((citation) => `${citation.sourceId}:${citation.locator}`),
                contradictingEvidenceIds: claim.citations.filter((citation) => citation.relationship === "contradicts").map((citation) => `${citation.sourceId}:${citation.locator}`),
              }))} />
              <section className="content-card"><div className="section-title"><div><span className="eyebrow">ANALYSIS ROLES</span><h2>Các vai trò phân tích</h2></div><small>Khác vai trò không đồng nghĩa độc lập model hoặc độc lập dữ liệu.</small></div><div className="agent-output-grid">{geminiResult.agents.map((agent) => <details key={agent.name}><summary><span><b>{agent.name}</b><small>{agent.role}</small></span><em>{agent.citations.length} URL trong tập làm việc</em></summary><div><MarkdownContent compact>{normalizeAgentMarkdown(agent.text)}</MarkdownContent></div></details>)}</div></section>
              <ProviderAndSourceAudit research={geminiResult} />
            </div>}

            {tab === "sources" && geminiResult && <div className="view-stack">
              <section className="content-card"><div className="section-title"><div><span className="eyebrow">PROVENANCE REGISTRY</span><h2>Nguồn và cụm provenance sơ bộ</h2></div><small>{geminiResult.sources.length} URL · {new Set(geminiResult.sources.map((source) => source.familyId)).size} cụm heuristic · audit {geminiResult.sourceAuditStatus}</small></div><div className="grounded-source-list">{geminiResult.sources.map((source,index) => <article className="source-entry" key={source.id}><a href={source.url} target="_blank" rel="noreferrer" title={`Mở nguồn: ${source.title}`}><span>{String(index+1).padStart(2,"0")}</span><div><b>{source.title}</b><small>{source.url}</small></div><em>{source.fullTextStatus} · {provenanceClusterLabel(geminiResult.sources, source.familyId)}</em></a></article>)}</div></section>
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
