import {
  CLAIM_TYPES,
  CLAIM_VERDICTS,
  CONFIDENCE_LEVELS,
  FULL_TEXT_STATUSES,
  SOURCE_TYPES,
  WARNING_CATEGORIES,
  WARNING_SEVERITIES,
  WARNING_STATUSES,
  WARNING_TARGET_TYPES,
  type ClaimRecord,
  type EvidenceRecord,
  type SourceRecord,
  type WarningRecord,
} from "./types.ts";
import { freezeRecord, isoDate, oneOf, requiredText, textArray, throwIfInvalid, unique, type ValidationIssue } from "./validation.ts";

export type SourceInput = SourceRecord;
export type EvidenceInput = EvidenceRecord;
export type ClaimInput = ClaimRecord;
export type WarningInput = WarningRecord;

export function createSource(input: SourceInput): SourceRecord {
  const issues: ValidationIssue[] = [];
  requiredText(issues, "id", input.id);
  if (requiredText(issues, "canonicalUrl", input.canonicalUrl)) {
    try {
      const url = new URL(input.canonicalUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("unsupported protocol");
    } catch {
      issues.push({ path: "canonicalUrl", code: "invalid_url", message: "must be an absolute HTTP(S) URL" });
    }
  }
  requiredText(issues, "publisher", input.publisher);
  textArray(issues, "authors", input.authors);
  isoDate(issues, "publishedAt", input.publishedAt, true);
  oneOf(issues, "sourceType", input.sourceType, SOURCE_TYPES);
  textArray(issues, "stakeholderGroups", input.stakeholderGroups);
  if (input.ownership !== null) requiredText(issues, "ownership", input.ownership);
  textArray(issues, "fundingNotes", input.fundingNotes);
  if (textArray(issues, "upstreamSourceIds", input.upstreamSourceIds) && input.upstreamSourceIds.includes(input.id)) {
    issues.push({ path: "upstreamSourceIds", code: "self_reference", message: "cannot contain the source's own id" });
  }
  requiredText(issues, "evidenceFamilyId", input.evidenceFamilyId);
  oneOf(issues, "fullTextStatus", input.fullTextStatus, FULL_TEXT_STATUSES);
  throwIfInvalid(issues);

  return freezeRecord({
    ...input,
    id: input.id.trim(),
    canonicalUrl: input.canonicalUrl.trim(),
    publisher: input.publisher.trim(),
    authors: unique(input.authors),
    stakeholderGroups: unique(input.stakeholderGroups),
    ownership: input.ownership?.trim() ?? null,
    fundingNotes: unique(input.fundingNotes),
    upstreamSourceIds: unique(input.upstreamSourceIds),
    evidenceFamilyId: input.evidenceFamilyId.trim(),
  });
}

export function createEvidence(input: EvidenceInput): EvidenceRecord {
  const issues: ValidationIssue[] = [];
  requiredText(issues, "id", input.id);
  requiredText(issues, "sourceId", input.sourceId);
  requiredText(issues, "quote", input.quote);
  requiredText(issues, "locator", input.locator);
  if (typeof input.contextBefore !== "string") issues.push({ path: "contextBefore", code: "invalid_type", message: "must be a string" });
  if (typeof input.contextAfter !== "string") issues.push({ path: "contextAfter", code: "invalid_type", message: "must be a string" });
  isoDate(issues, "extractedAt", input.extractedAt);
  requiredText(issues, "contentHash", input.contentHash);
  throwIfInvalid(issues);
  return freezeRecord({ ...input, id: input.id.trim(), sourceId: input.sourceId.trim(), quote: input.quote.trim(), locator: input.locator.trim(), contentHash: input.contentHash.trim() });
}

export function createClaim(input: ClaimInput): ClaimRecord {
  const issues: ValidationIssue[] = [];
  requiredText(issues, "id", input.id);
  requiredText(issues, "text", input.text);
  oneOf(issues, "type", input.type, CLAIM_TYPES);
  const supportValid = textArray(issues, "supportingEvidenceIds", input.supportingEvidenceIds);
  const contradictionValid = textArray(issues, "contradictingEvidenceIds", input.contradictingEvidenceIds);
  textArray(issues, "assumptions", input.assumptions);
  oneOf(issues, "verdict", input.verdict, CLAIM_VERDICTS);
  oneOf(issues, "confidence", input.confidence, CONFIDENCE_LEVELS);
  requiredText(issues, "confidenceReason", input.confidenceReason);
  if (supportValid && input.verdict === "supported" && input.supportingEvidenceIds.length === 0) {
    issues.push({ path: "supportingEvidenceIds", code: "missing_support", message: "a supported claim must cite supporting evidence" });
  }
  if (contradictionValid && input.verdict === "unsupported" && input.contradictingEvidenceIds.length === 0) {
    issues.push({ path: "contradictingEvidenceIds", code: "missing_contradiction", message: "an unsupported claim must cite contradicting evidence" });
  }
  if (supportValid && contradictionValid) {
    const contradictionSet = new Set(input.contradictingEvidenceIds);
    if (input.supportingEvidenceIds.some((id) => contradictionSet.has(id))) {
      issues.push({ path: "supportingEvidenceIds", code: "evidence_conflict", message: "the same evidence cannot support and contradict a claim" });
    }
  }
  throwIfInvalid(issues);
  return freezeRecord({
    ...input,
    id: input.id.trim(),
    text: input.text.trim(),
    supportingEvidenceIds: unique(input.supportingEvidenceIds),
    contradictingEvidenceIds: unique(input.contradictingEvidenceIds),
    assumptions: unique(input.assumptions),
    confidenceReason: input.confidenceReason.trim(),
  });
}

export function createWarning(input: WarningInput): WarningRecord {
  const issues: ValidationIssue[] = [];
  requiredText(issues, "id", input.id);
  oneOf(issues, "targetType", input.targetType, WARNING_TARGET_TYPES);
  requiredText(issues, "targetId", input.targetId);
  oneOf(issues, "category", input.category, WARNING_CATEGORIES);
  requiredText(issues, "observableIndicator", input.observableIndicator);
  if (textArray(issues, "evidenceIds", input.evidenceIds) && input.evidenceIds.length === 0) {
    issues.push({ path: "evidenceIds", code: "missing_evidence", message: "a warning must cite observable evidence" });
  }
  if (input.alternativeExplanation !== null) requiredText(issues, "alternativeExplanation", input.alternativeExplanation);
  oneOf(issues, "severity", input.severity, WARNING_SEVERITIES);
  oneOf(issues, "confidence", input.confidence, CONFIDENCE_LEVELS);
  requiredText(issues, "confidenceReason", input.confidenceReason);
  oneOf(issues, "status", input.status, WARNING_STATUSES);
  throwIfInvalid(issues);
  return freezeRecord({
    ...input,
    id: input.id.trim(),
    targetId: input.targetId.trim(),
    observableIndicator: input.observableIndicator.trim(),
    evidenceIds: unique(input.evidenceIds),
    alternativeExplanation: input.alternativeExplanation?.trim() ?? null,
    confidenceReason: input.confidenceReason.trim(),
  });
}
