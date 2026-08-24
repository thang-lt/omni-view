import assert from "node:assert/strict";
import test from "node:test";

import { buildSourceProviderRegistry, mapGroundedSources, runLiveResearch, selectBalancedCitations } from "../application/research/run-live-research.ts";

test("reserves room for both scouts when selecting the final source set", () => {
  const balanced = Array.from({ length: 8 }, (_, index) => ({ title: `Balanced ${index}`, url: `https://balanced${index}.example/` }));
  const counter = Array.from({ length: 4 }, (_, index) => ({ title: `Counter ${index}`, url: `https://counter${index}.example/` }));
  const selected = selectBalancedCitations(balanced, counter, 8);

  assert.equal(selected.filter((citation) => citation.title.startsWith("Balanced")).length, 4);
  assert.equal(selected.filter((citation) => citation.title.startsWith("Counter")).length, 4);
});

test("uses grounding support when direct source extraction is unavailable", () => {
  const sources = mapGroundedSources(
    [{ title: "Publisher", url: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/token" }],
    [{
      requestedUrl: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/token",
      finalUrl: "https://publisher.example/report",
      status: "inaccessible",
      excerpt: "",
      groundingExcerpt: "The linked report states a measurable result.",
    }],
  );

  assert.equal(sources[0].fullTextStatus, "grounded-support");
  assert.equal(sources[0].url, "https://publisher.example/report");
  assert.match(sources[0].excerpt, /measurable result/);
  assert.match(sources[0].locator, /not a verbatim source-page quote/);
  assert.deepEqual(sources[0].evidencePassages.map((passage) => passage.kind), ["grounding-support"]);
});

test("prefers a successful direct extraction over a later duplicate failure", () => {
  const url = "https://source.example/report";
  const sources = mapGroundedSources([{ title: "Source", url }], [
    { requestedUrl: url, finalUrl: url, status: "read", excerpt: "Direct source text." },
    { requestedUrl: url, finalUrl: url, status: "inaccessible", excerpt: "", groundingExcerpt: "Grounded summary." },
  ]);

  assert.equal(sources[0].fullTextStatus, "read");
  assert.equal(sources[0].excerpt, "Direct source text.");
  assert.deepEqual(sources[0].evidencePassages.map((passage) => passage.kind), ["direct", "grounding-support"]);
});

test("stores source providers and records which scout discovered them", () => {
  const citations = [
    { title: "Publisher", url: "https://redirect.example/a" },
    { title: "Publisher", url: "https://redirect.example/b" },
  ];
  const sources = [
    { id: "S1", title: "Report", url: "https://publisher.example/a", excerpt: "A", locator: "excerpt", fullTextStatus: "read" },
    { id: "S2", title: "Response", url: "https://publisher.example/b", excerpt: "B", locator: "excerpt", fullTextStatus: "read" },
  ];
  const providers = buildSourceProviderRegistry(citations, sources, [citations[0]], [citations[1]]);

  assert.equal(providers.length, 1);
  assert.equal(providers[0].domain, "publisher.example");
  assert.deepEqual(providers[0].sourceIds, ["S1", "S2"]);
  assert.deepEqual(providers[0].discoveredBy, ["balanced-scout", "counter-scout"]);
});

test("orchestrates two grounded scouts, extraction, audit and judge through ports", async () => {
  const calls = [];
  const phases = [];
  const logs = [];
  let extractedCitations = [];

  const responses = {
    "balanced-scout": { text: "Nguồn sơ cấp", citations: [{ title: "Official", url: "https://official.example/report" }] },
    "counter-scout": { text: "Phản chứng", citations: [{ title: "Local", url: "https://local.example/story" }] },
    perspective: { text: JSON.stringify({ perspectives: [{ id: "V1", thesis: "Implementation should proceed.", sourceIndexes: [1, 2], stakeholderGroups: ["claimant", "affected"], assumptions: ["Capacity exists"], omissions: ["Long-term cost"], strongestCounterargument: "Capacity is uneven." }], blindSpots: [] }), citations: [] },
    "provider-verification": { text: "Provider verification grounded report", citations: [{ title: "Independent media review", url: "https://review.example/providers" }] },
    audit: {
      text: JSON.stringify({
        analysisMarkdown: "## Kiểm định luận điểm\n\n- Đã kiểm tra.",
        providerAssessments: [
          { providerId: "P1", reputationAssessment: "established", politicalOrientation: "institutional", ownershipAndAffiliations: ["public body"], reputationSignals: ["publishes methodology"], caveats: [], verificationCitationUrls: ["https://review.example/providers"] },
          { providerId: "P2", reputationAssessment: "mixed", politicalOrientation: "local advocacy", ownershipAndAffiliations: [], reputationSignals: ["limited corrections information"], caveats: ["Không đồng nghĩa nội dung sai"], verificationCitationUrls: ["https://review.example/providers"] },
        ],
        sourceAudits: [
          {
            sourceIndex: 1,
            sourceType: "primary",
            stance: "claimant",
            stakeholderGroups: ["claimant"],
            warnings: [{
              category: "methodology", observableIndicator: "Mẫu nhỏ", evidenceQuote: "A sample of ten participants.",
              alternativeExplanation: "Nghiên cứu thăm dò", severity: "medium", confidence: "medium",
              confidenceReason: "Có trong excerpt", verificationHint: "Đọc phương pháp",
            }],
          },
          {
            sourceIndex: 2,
            sourceType: "journalistic",
            stance: "counterparty",
            stakeholderGroups: ["affected"],
            warnings: [],
          },
        ],
      }),
      citations: [],
    },
    "judge-claims": {
      text: JSON.stringify({
        claims: [{
          id: "C1", text: "Claim", type: "empirical", verdict: "supported", confidence: "medium",
          confidenceReason: "Có bằng chứng",
          evidenceLinks: [{ relationship: "supports", sourceIndex: 1, quote: "A sample of ten participants." }], unresolvedQuestions: [],
        }],
      }),
      citations: [],
    },
    "judge-report": {
      text: JSON.stringify({ reportMarkdown: "# Kết luận có điều kiện" }),
      citations: [],
    },
  };

  const output = await runLiveResearch("Một chủ đề kiểm thử", {
    callGemini: async (request) => {
      calls.push(request);
      return responses[request.operation];
    },
    extractSources: async (citations) => {
      extractedCitations = citations;
      return [
        { id: "S1", title: "Official", url: citations[0].url, excerpt: "A sample of ten participants.", locator: "paragraph 2", fullTextStatus: "read" },
        { id: "S2", title: "Local", url: citations[1].url, excerpt: "Affected group disputes the claim.", locator: "paragraph 4", fullTextStatus: "read" },
      ];
    },
    setPhase: (phase) => phases.push(phase),
    log: (...entries) => logs.push(...entries),
  });

  assert.deepEqual(calls.map((call) => call.operation), ["balanced-scout", "counter-scout", "perspective", "provider-verification", "audit", "judge-claims", "judge-report"]);
  assert.deepEqual(calls.filter((call) => call.useSearch).map((call) => call.operation), ["balanced-scout", "counter-scout", "provider-verification"]);
  assert.equal(calls.find((call) => call.operation === "provider-verification").extractSources, false);
  assert.equal(extractedCitations.length, 2);
  assert.deepEqual(phases, [1, 2, 3, 4, 5]);
  assert.equal(output.sources.length, 2);
  assert.equal(output.sources[0].audit.warnings[0].evidenceVerified, true);
  assert.equal(output.sourceProviders.length, 2);
  assert.equal(output.sourceProviders[0].assessment.reputationAssessment, "established");
  assert.equal(output.sourceProviders[0].assessment.verificationCitations.length, 1);
  assert.match(output.claims[0].citations[0].locator, /^paragraph 2/);
  assert.equal(output.citationAudit.complete, true);
  assert.match(output.report, /Kết luận có điều kiện/);
  const claimJudgeCall = calls.find((call) => call.operation === "judge-claims");
  assert.match(claimJudgeCall.prompt, /3-6 luận điểm trọng yếu/);
  assert.doesNotMatch(claimJudgeCall.prompt, /NHIỆM VỤ BÁO CÁO/);
  const reportJudgeCall = calls.find((call) => call.operation === "judge-report");
  assert.match(reportJudgeCall.prompt, /GitHub-Flavored Markdown hợp lệ/);
  assert.match(reportJudgeCall.prompt, /VALIDATED CLAIM LEDGER/);
  assert.match(reportJudgeCall.prompt, /## Tóm tắt điều hành/);
  assert.match(reportJudgeCall.prompt, /## Kết luận có điều kiện/);
  assert.ok(logs.some((entry) => entry.includes("Evidence Judge")));
});

test("splits eight-source warning audit without verifying the same provider twice", async () => {
  const calls = [];
  const citations = Array.from({ length: 8 }, (_, index) => ({ title: `Source ${index + 1}`, url: `https://source${index + 1}.example/report` }));
  await runLiveResearch("Chủ đề cần tám nguồn đối chiếu", {
    callGemini: async (request) => {
      calls.push(request);
      if (request.operation === "balanced-scout") return { text: "Scout", citations: citations.slice(0, 4) };
      if (request.operation === "counter-scout") return { text: "Counter", citations: citations.slice(4) };
      if (request.operation === "perspective") return { text: JSON.stringify({ perspectives: [{ id: "V1", thesis: "Sources present competing evidence.", sourceIndexes: [1, 5], stakeholderGroups: [], assumptions: [], omissions: [], strongestCounterargument: "More direct evidence is needed." }], blindSpots: [] }), citations: [] };
      if (request.operation === "provider-verification") {
        throw new Error("empty provider verification candidate");
      }
      if (request.operation === "audit") {
        const indexes = Array.from(request.prompt.matchAll(/"sourceIndex":(\d+)/g), (match) => Number(match[1]));
        const providerIds = Array.from(new Set(Array.from(request.prompt.matchAll(/"id":"(P\d+)"/g), (match) => match[1])));
        return { text: JSON.stringify({
          providerAssessments: providerIds.map((providerId) => ({ providerId, reputationAssessment: "unknown", politicalOrientation: "Chưa xác định", ownershipAndAffiliations: [], reputationSignals: [], caveats: ["Thiếu dữ liệu độc lập"], verificationCitationUrls: [] })),
          sourceAudits: indexes.map((sourceIndex) => ({ sourceIndex, sourceType: "journalistic", stance: "neutral", stakeholderGroups: [], warnings: [] })),
        }), citations: [] };
      }
      if (request.operation === "judge-claims") return { text: JSON.stringify({
        claims: [{
          id: "C1", text: "A material claim.", type: "empirical", verdict: "unresolved", confidence: "low",
          confidenceReason: "Needs verification", evidenceLinks: [], unresolvedQuestions: ["What confirms this?"],
        }],
      }), citations: [] };
      return { text: JSON.stringify({ reportMarkdown: "# Report" }), citations: [] };
    },
    extractSources: async () => citations.map((citation, index) => ({ id: `S${index + 1}`, title: citation.title, url: `https://shared.example/report-${index + 1}`, excerpt: `Readable evidence from source ${index + 1}.`, locator: "excerpt", fullTextStatus: "read" })),
    setPhase() {},
    log() {},
  });

  assert.equal(calls.filter((call) => call.operation === "audit").length, 2);
  assert.equal(calls.filter((call) => call.operation === "provider-verification").length, 1);
  assert.equal(calls.filter((call) => call.operation === "audit").every((call) => !call.useSearch), true);
  assert.equal(calls.filter((call) => call.operation === "judge-claims").length, 1);
  assert.equal(calls.filter((call) => call.operation === "judge-report").length, 1);
});
