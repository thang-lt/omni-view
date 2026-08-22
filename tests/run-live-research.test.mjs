import assert from "node:assert/strict";
import test from "node:test";

import { runLiveResearch } from "../application/research/run-live-research.ts";

test("orchestrates two grounded scouts, extraction, audit, coverage and judge through ports", async () => {
  const calls = [];
  const phases = [];
  const logs = [];
  let extractedCitations = [];

  const responses = {
    "balanced-scout": { text: "Nguồn sơ cấp", citations: [{ title: "Official", url: "https://official.example/report" }] },
    "counter-scout": { text: "Phản chứng", citations: [{ title: "Local", url: "https://local.example/story" }] },
    perspective: { text: "Hai steelman", citations: [] },
    audit: {
      text: JSON.stringify({
        analysisMarkdown: "## Kiểm định luận điểm\n\n- Đã kiểm tra.",
        sourceAudits: [
          {
            sourceIndex: 1,
            sourceType: "primary",
            stance: "claimant",
            stakeholderGroups: ["claimant"],
            coverageTags: ["primary", "claimant", "independent_expert"],
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
            coverageTags: ["counterparty", "affected", "local", "counterevidence"],
            warnings: [],
          },
        ],
      }),
      citations: [],
    },
    judge: {
      text: JSON.stringify({
        reportMarkdown: "# Kết luận có điều kiện",
        claims: [{
          id: "C1", text: "Claim", type: "empirical", verdict: "supported", confidence: "medium",
          confidenceReason: "Có bằng chứng", evidenceSourceIndexes: [1],
          evidenceQuotes: [{ sourceIndex: 1, quote: "sample of ten" }],
          contradictingSourceIndexes: [2], unresolvedQuestions: [],
        }],
      }),
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

  assert.deepEqual(calls.map((call) => call.operation), ["balanced-scout", "counter-scout", "perspective", "audit", "judge"]);
  assert.deepEqual(calls.filter((call) => call.useSearch).map((call) => call.operation), ["balanced-scout", "counter-scout"]);
  assert.equal(extractedCitations.length, 2);
  assert.deepEqual(phases, [1, 2, 3, 5]);
  assert.equal(output.result.sources.length, 2);
  assert.equal(output.result.sources[0].audit.warnings[0].evidenceVerified, true);
  assert.equal(output.result.coverage.passed, true);
  assert.match(output.result.claims[0].citations[0].locator, /^paragraph 2/);
  assert.equal(output.result.citationAudit.complete, true);
  assert.match(output.result.report, /Kết luận có điều kiện/);
  assert.ok(logs.some((entry) => entry.includes("Coverage")));
});

test("splits eight-source warning audit into bounded batches", async () => {
  const calls = [];
  const citations = Array.from({ length: 8 }, (_, index) => ({ title: `Source ${index + 1}`, url: `https://source${index + 1}.example/report` }));
  await runLiveResearch("Chủ đề cần tám nguồn đối chiếu", {
    callGemini: async (request) => {
      calls.push(request);
      if (request.operation === "balanced-scout") return { text: "Scout", citations: citations.slice(0, 4) };
      if (request.operation === "counter-scout") return { text: "Counter", citations: citations.slice(4) };
      if (request.operation === "perspective") return { text: "Perspective", citations: [] };
      if (request.operation === "audit") {
        const indexes = Array.from(request.prompt.matchAll(/"sourceIndex":(\d+)/g), (match) => Number(match[1]));
        return { text: JSON.stringify({ analysisMarkdown: "Audit batch", sourceAudits: indexes.map((sourceIndex) => ({ sourceIndex, sourceType: "journalistic", stance: "neutral", stakeholderGroups: [], coverageTags: [], warnings: [] })) }), citations: [] };
      }
      return { text: JSON.stringify({ reportMarkdown: "# Report", claims: [] }), citations: [] };
    },
    extractSources: async () => citations.map((citation, index) => ({ id: `S${index + 1}`, title: citation.title, url: citation.url, excerpt: `Readable evidence from source ${index + 1}.`, locator: "excerpt", fullTextStatus: "read" })),
    setPhase() {},
    log() {},
  });

  assert.equal(calls.filter((call) => call.operation === "audit").length, 2);
});
