import assert from "node:assert/strict";
import test from "node:test";

import {
  auditCitationCompleteness,
  canonicalizeSourceUrl,
  clusterSourceFamilies,
} from "../application/research/source-intelligence.ts";

test("canonicalizes equivalent web URLs without erasing meaningful query parameters", () => {
  assert.equal(
    canonicalizeSourceUrl("HTTPS://WWW.Example.com:443/story/?utm_source=x&b=2&a=1#section"),
    "https://example.com/story?a=1&b=2",
  );
  assert.equal(canonicalizeSourceUrl("https://example.com/search?q=ai"), "https://example.com/search?q=ai");
  assert.equal(canonicalizeSourceUrl("javascript:alert(1)"), null);
});

test("clusters exact copies and explicit upstream provenance, but not a whole publisher", () => {
  const families = clusterSourceFamilies([
    { id: "wire", url: "https://wire.example/report", contentFingerprint: "same-copy" },
    { id: "republish", url: "https://paper.example/story?utm_medium=social", contentFingerprint: "same-copy" },
    { id: "analysis", url: "https://paper.example/analysis", upstreamSourceIds: ["wire"] },
    { id: "independent", url: "https://paper.example/interview" },
  ]);

  assert.deepEqual(families.map((family) => family.sourceIds), [
    ["analysis", "republish", "wire"],
    ["independent"],
  ]);
  assert.equal(families[0].rootSourceId, "wire");
});

test("citation audit requires a known source and a precise evidence locator", () => {
  const result = auditCitationCompleteness(
    [
      { id: "c1", isMaterial: true, citations: [{ sourceId: "s1", locator: "paragraph 4" }] },
      { id: "c2", isMaterial: true, citations: [{ sourceId: "s1" }] },
      { id: "c3", isMaterial: true, citations: [{ sourceId: "missing", locator: "p. 3" }] },
      { id: "minor", isMaterial: false, citations: [] },
    ],
    [{ id: "s1" }],
  );

  assert.equal(result.complete, false);
  assert.equal(result.materialClaimCount, 3);
  assert.equal(result.completeMaterialClaimCount, 1);
  assert.equal(result.completenessRatio, 1 / 3);
  assert.deepEqual(result.findings, [
    { claimId: "c2", code: "missing_locator", citationIndexes: [0] },
    { claimId: "c3", code: "unknown_source", citationIndexes: [0] },
  ]);
});
