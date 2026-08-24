export const SOURCE_TYPES = ["primary", "secondary", "academic", "journalistic", "commentary", "dataset"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const FULL_TEXT_STATUSES = ["read", "partial", "grounded-support", "metadata-only", "blocked"] as const;
export type FullTextStatus = (typeof FULL_TEXT_STATUSES)[number];

export interface SourceRecord {
  readonly id: string;
  readonly canonicalUrl: string;
  readonly publisher: string;
  readonly authors: readonly string[];
  readonly publishedAt: string | null;
  readonly sourceType: SourceType;
  readonly stakeholderGroups: readonly string[];
  readonly ownership: string | null;
  readonly fundingNotes: readonly string[];
  readonly upstreamSourceIds: readonly string[];
  readonly evidenceFamilyId: string;
  readonly fullTextStatus: FullTextStatus;
}

export interface EvidenceRecord {
  readonly id: string;
  readonly sourceId: string;
  readonly quote: string;
  readonly locator: string;
  readonly contextBefore: string;
  readonly contextAfter: string;
  readonly extractedAt: string;
  readonly contentHash: string;
}

export const CLAIM_TYPES = ["empirical", "causal", "predictive", "interpretive", "normative"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_VERDICTS = ["supported", "mixed", "unsupported", "unresolved"] as const;
export type ClaimVerdict = (typeof CLAIM_VERDICTS)[number];

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export interface ClaimRecord {
  readonly id: string;
  readonly text: string;
  readonly type: ClaimType;
  readonly supportingEvidenceIds: readonly string[];
  readonly contradictingEvidenceIds: readonly string[];
  readonly assumptions: readonly string[];
  readonly verdict: ClaimVerdict;
  readonly confidence: Confidence;
  readonly confidenceReason: string;
}

export const WARNING_TARGET_TYPES = ["source", "claim", "evidence"] as const;
export type WarningTargetType = (typeof WARNING_TARGET_TYPES)[number];

export const WARNING_CATEGORIES = [
  "conflict-of-interest",
  "selection-bias",
  "methodology",
  "factual-reliability",
  "misinformation-risk",
  "propaganda-technique",
  "hostile-language",
  "political-framing",
  "recency",
  "geographic-scope",
  "provenance",
] as const;
export type WarningCategory = (typeof WARNING_CATEGORIES)[number];

export const WARNING_SEVERITIES = ["info", "low", "medium", "high"] as const;
export type WarningSeverity = (typeof WARNING_SEVERITIES)[number];

export const WARNING_STATUSES = ["machine-only", "cross-checked", "human-reviewed"] as const;
export type WarningStatus = (typeof WARNING_STATUSES)[number];

export interface WarningRecord {
  readonly id: string;
  readonly targetType: WarningTargetType;
  readonly targetId: string;
  readonly category: WarningCategory;
  readonly observableIndicator: string;
  readonly evidenceIds: readonly string[];
  readonly alternativeExplanation: string | null;
  readonly severity: WarningSeverity;
  readonly confidence: Confidence;
  readonly confidenceReason: string;
  readonly status: WarningStatus;
}
