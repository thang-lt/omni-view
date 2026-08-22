import assert from "node:assert/strict";
import test from "node:test";

import {
  DomainValidationError,
  REQUIRED_COVERAGE,
  buildCoverageReport,
  createClaim,
  createEvidence,
  createSource,
  createWarning,
} from "../domain/research/index.ts";

const sourceInput = {
  id: "source-1",
  canonicalUrl: "https://example.org/report",
  publisher: "Example Institute",
  authors: ["An Nguyen"],
  publishedAt: "2026-08-10T08:00:00.000Z",
  sourceType: "primary",
  stakeholderGroups: ["affected-community"],
  ownership: null,
  fundingNotes: [],
  upstreamSourceIds: [],
  evidenceFamilyId: "family-1",
  fullTextStatus: "read",
};

test("creates an immutable source after normalizing repeated identifiers", () => {
  const source = createSource({
    ...sourceInput,
    upstreamSourceIds: ["upstream-1", "upstream-1"],
    stakeholderGroups: ["affected-community", "affected-community"],
  });

  assert.deepEqual(source.upstreamSourceIds, ["upstream-1"]);
  assert.deepEqual(source.stakeholderGroups, ["affected-community"]);
  assert.ok(Object.isFrozen(source));
  assert.ok(Object.isFrozen(source.authors));
});

test("rejects an invalid source URL and self-referencing provenance", () => {
  assert.throws(
    () => createSource({ ...sourceInput, canonicalUrl: "file:///secret", upstreamSourceIds: ["source-1"] }),
    (error) => {
      assert.ok(error instanceof DomainValidationError);
      assert.deepEqual(error.issues.map((issue) => issue.path), ["canonicalUrl", "upstreamSourceIds"]);
      return true;
    },
  );
});

test("requires traceable evidence and creates an immutable evidence record", () => {
  const evidence = createEvidence({
    id: "evidence-1",
    sourceId: "source-1",
    quote: "The policy entered into force in June.",
    locator: "section 3, paragraph 2",
    contextBefore: "The decree was signed in May.",
    contextAfter: "Implementation guidance followed.",
    extractedAt: "2026-08-18T01:00:00.000Z",
    contentHash: "sha256:2f4d8f0c",
  });

  assert.equal(evidence.sourceId, "source-1");
  assert.ok(Object.isFrozen(evidence));
  assert.throws(
    () => createEvidence({ ...evidence, locator: "", contentHash: "" }),
    (error) => error instanceof DomainValidationError && error.issues.length === 2,
  );
});

test("a supported claim must cite support and cannot cite the same evidence as contradiction", () => {
  const claim = createClaim({
    id: "claim-1",
    text: "The policy entered into force in June.",
    type: "empirical",
    supportingEvidenceIds: ["evidence-1", "evidence-1"],
    contradictingEvidenceIds: [],
    assumptions: [],
    verdict: "supported",
    confidence: "high",
    confidenceReason: "The primary decree states the effective date.",
  });

  assert.deepEqual(claim.supportingEvidenceIds, ["evidence-1"]);
  assert.throws(
    () => createClaim({ ...claim, contradictingEvidenceIds: ["evidence-1"] }),
    (error) => error instanceof DomainValidationError && error.issues.some((issue) => issue.code === "evidence_conflict"),
  );
  assert.throws(
    () => createClaim({ ...claim, supportingEvidenceIds: [] }),
    (error) => error instanceof DomainValidationError && error.issues.some((issue) => issue.code === "missing_support"),
  );
});

test("a warning records observable evidence without declaring a source false", () => {
  const warning = createWarning({
    id: "warning-1",
    targetType: "source",
    targetId: "source-1",
    category: "selection-bias",
    observableIndicator: "The article reports only the period after the baseline changed.",
    evidenceIds: ["evidence-1"],
    alternativeExplanation: "The earlier dataset may not have been available.",
    severity: "medium",
    confidence: "medium",
    confidenceReason: "The visible chart starts after the change, but editorial intent is unknown.",
    status: "machine-only",
  });

  assert.equal(warning.category, "selection-bias");
  assert.throws(
    () => createWarning({ ...warning, evidenceIds: [] }),
    (error) => error instanceof DomainValidationError && error.issues.some((issue) => issue.code === "missing_evidence"),
  );
});

test("coverage report exposes missing perspectives instead of silently passing", () => {
  const report = buildCoverageReport([
    { requirement: "primary-source", sourceIds: ["source-1"] },
    { requirement: "claimant", sourceIds: ["source-2"] },
    { requirement: "counterparty", sourceIds: [] },
  ]);

  assert.deepEqual(REQUIRED_COVERAGE, [
    "primary-source",
    "claimant",
    "counterparty",
    "affected-group",
    "independent-expert",
    "local-perspective",
    "direct-counterevidence",
  ]);
  assert.equal(report.complete, false);
  assert.deepEqual(report.metRequirements, ["primary-source", "claimant"]);
  assert.deepEqual(report.missingRequirements, [
    "counterparty",
    "affected-group",
    "independent-expert",
    "local-perspective",
    "direct-counterevidence",
  ]);
  assert.equal(report.coverageRatio, 2 / 7);
  assert.ok(Object.isFrozen(report.entries));
});

test("coverage rejects unknown requirements and unknown source identifiers", () => {
  assert.throws(
    () => buildCoverageReport([{ requirement: "majority-vote", sourceIds: ["source-1"] }]),
    (error) => error instanceof DomainValidationError,
  );
  assert.throws(
    () => buildCoverageReport([{ requirement: "primary-source", sourceIds: [""] }]),
    (error) => error instanceof DomainValidationError,
  );
});
