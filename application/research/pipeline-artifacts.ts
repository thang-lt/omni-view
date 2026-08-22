import { isRecord, normalizeAgentMarkdown, parseJsonEnvelope } from "../../lib/research-format.ts";

export type ExtractedSourcePacket = {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  locator: string;
  fullTextStatus: "read" | "partial" | "grounded-support" | "metadata-only" | "inaccessible";
};

export type WarningCategory =
  | "conflict-of-interest"
  | "selection-bias"
  | "methodology"
  | "factual-reliability"
  | "misinformation-risk"
  | "propaganda-technique"
  | "hostile-language"
  | "political-framing"
  | "recency"
  | "geographic-scope"
  | "provenance";

export type SourceWarningArtifact = {
  category: WarningCategory;
  observableIndicator: string;
  evidenceQuote: string;
  evidenceVerified: boolean;
  alternativeExplanation: string | null;
  severity: "info" | "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  confidenceReason: string;
  verificationHint: string;
  reviewStatus: "machine-only";
};

export type SourceAuditArtifact = {
  sourceId: string;
  sourceIndex: number;
  sourceType: string;
  stance: string;
  stakeholderGroups: string[];
  coverageTags: string[];
  warnings: SourceWarningArtifact[];
};

export type SourceProviderRegistryEntry = {
  id: string;
  name: string;
  domain: string;
  sourceIds: string[];
  discoveredBy: Array<"balanced-scout" | "counter-scout">;
};

export type ProviderAssessmentArtifact = {
  providerId: string;
  providerName: string;
  reputationAssessment: "established" | "mixed" | "limited-evidence" | "unknown";
  politicalOrientation: string;
  ownershipAndAffiliations: string[];
  reputationSignals: string[];
  caveats: string[];
  verificationCitations: Array<{ title: string; url: string }>;
  reviewStatus: "machine-only";
};

export type SourceAuditParseContext = {
  providers?: readonly SourceProviderRegistryEntry[];
  verificationCitations?: readonly { title: string; url: string }[];
};

export type ParsedSourceAuditArtifact = {
  analysisMarkdown: string;
  sourceAudits: SourceAuditArtifact[];
  providerAssessments: ProviderAssessmentArtifact[];
  status: "complete" | "incomplete";
  missingSourceIndexes: number[];
  duplicateSourceIndexes: number[];
  missingProviderIds: string[];
};

export type ClaimArtifact = {
  id: string;
  text: string;
  type: "empirical" | "causal" | "predictive" | "interpretive" | "normative";
  verdict: "supported" | "mixed" | "unsupported" | "unresolved";
  confidence: "low" | "medium" | "high";
  confidenceReason: string;
  citations: Array<{ sourceId: string; locator: string; quote: string; evidenceVerified: true }>;
  contradictingSourceIds: string[];
  unresolvedQuestions: string[];
};

const WARNING_CATEGORIES = new Set<WarningCategory>([
  "conflict-of-interest", "selection-bias", "methodology", "factual-reliability",
  "misinformation-risk", "propaganda-technique", "hostile-language", "political-framing",
  "recency", "geographic-scope", "provenance",
]);
const LEVELS = new Set(["low", "medium", "high"]);
const SEVERITIES = new Set(["info", "low", "medium", "high"]);
const CLAIM_TYPES = new Set(["empirical", "causal", "predictive", "interpretive", "normative"]);
const CLAIM_VERDICTS = new Set(["supported", "mixed", "unsupported", "unresolved"]);
const COVERAGE_TAGS = new Set(["primary", "claimant", "counterparty", "affected", "independent_expert", "local", "counterevidence"]);
const REPUTATION_ASSESSMENTS = new Set(["established", "mixed", "limited-evidence", "unknown"]);

function strings(value: unknown, limit = 12): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))).slice(0, limit);
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function integerIndexes(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is number => typeof item === "number" && Number.isInteger(item))));
}

function verifiedClaimCitations(value: unknown, sources: ExtractedSourcePacket[], invalidIndexes: Set<number>): ClaimArtifact["citations"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ClaimArtifact["citations"] => {
    if (!isRecord(item) || typeof item.sourceIndex !== "number" || !Number.isInteger(item.sourceIndex) || typeof item.quote !== "string") return [];
    const source = sources[item.sourceIndex - 1];
    if (!source) {
      invalidIndexes.add(item.sourceIndex);
      return [];
    }
    const quote = item.quote.trim();
    const characterIndex = source.excerpt.toLocaleLowerCase().indexOf(quote.toLocaleLowerCase());
    if (!quote || characterIndex < 0) return [];
    return [{ sourceId: source.id, locator: `${source.locator}, character ${characterIndex}`, quote, evidenceVerified: true }];
  });
}

export function buildEvidencePacket(sources: ExtractedSourcePacket[], sourceIndexOffset = 0): string {
  const untrustedSources = sources.map((source, index) => ({
    sourceIndex: sourceIndexOffset + index + 1,
    id: source.id,
    title: source.title,
    url: source.url,
    fullTextStatus: source.fullTextStatus,
    locator: source.locator,
    content: source.excerpt || "[Không có nội dung đã trích xuất]",
  }));
  return `<UNTRUSTED_SOURCE_DATA_JSON>\n${JSON.stringify({ untrustedSources })}\n</UNTRUSTED_SOURCE_DATA_JSON>`;
}

export function mergeSourceAuditArtifacts(
  artifacts: readonly ParsedSourceAuditArtifact[],
  sources: readonly ExtractedSourcePacket[],
  providers: readonly SourceProviderRegistryEntry[] = [],
): ParsedSourceAuditArtifact {
  const counts = new Map<number, number>();
  const byIndex = new Map<number, SourceAuditArtifact>();
  const assessmentByProvider = new Map<string, ProviderAssessmentArtifact>();
  for (const artifact of artifacts) {
    for (const audit of artifact.sourceAudits) {
      counts.set(audit.sourceIndex, (counts.get(audit.sourceIndex) || 0) + 1);
      if (sources[audit.sourceIndex - 1] && !byIndex.has(audit.sourceIndex)) byIndex.set(audit.sourceIndex, audit);
    }
    for (const assessment of artifact.providerAssessments) {
      const current = assessmentByProvider.get(assessment.providerId);
      if (!current || assessment.reputationSignals.length + assessment.verificationCitations.length > current.reputationSignals.length + current.verificationCitations.length) {
        assessmentByProvider.set(assessment.providerId, assessment);
      }
    }
  }
  const expected = sources.map((_, index) => index + 1);
  const missingSourceIndexes = expected.filter((index) => !byIndex.has(index));
  const duplicateSourceIndexes = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([index]) => index)
    .sort((left, right) => left - right);
  const missingProviderIds = providers.map((provider) => provider.id).filter((providerId) => !assessmentByProvider.has(providerId));
  return {
    analysisMarkdown: artifacts.map((artifact) => artifact.analysisMarkdown.trim()).filter(Boolean).join("\n\n---\n\n"),
    sourceAudits: Array.from(byIndex.values()).sort((left, right) => left.sourceIndex - right.sourceIndex),
    providerAssessments: Array.from(assessmentByProvider.values()),
    status: missingSourceIndexes.length === 0 && duplicateSourceIndexes.length === 0 && missingProviderIds.length === 0 ? "complete" : "incomplete",
    missingSourceIndexes,
    duplicateSourceIndexes,
    missingProviderIds,
  };
}

function parseWarning(value: unknown, source: ExtractedSourcePacket): SourceWarningArtifact | null {
  if (!isRecord(value)) return null;
  const category = WARNING_CATEGORIES.has(value.category as WarningCategory) ? value.category as WarningCategory : null;
  const observableIndicator = text(value.observableIndicator);
  const evidenceQuote = text(value.evidenceQuote);
  const verificationHint = text(value.verificationHint);
  if (!category || !observableIndicator || !verificationHint) return null;

  const evidenceVerified = evidenceQuote.length >= 20 && source.excerpt.toLocaleLowerCase().includes(evidenceQuote.toLocaleLowerCase());
  const requestedConfidence = LEVELS.has(value.confidence as string) ? value.confidence as "low" | "medium" | "high" : "low";
  const requestedSeverity = SEVERITIES.has(value.severity as string) ? value.severity as "info" | "low" | "medium" | "high" : "info";
  return {
    category,
    observableIndicator,
    evidenceQuote,
    evidenceVerified,
    alternativeExplanation: typeof value.alternativeExplanation === "string" && value.alternativeExplanation.trim() ? value.alternativeExplanation.trim() : null,
    severity: evidenceVerified ? requestedSeverity : "info",
    confidence: evidenceVerified ? requestedConfidence : "low",
    confidenceReason: evidenceVerified ? text(value.confidenceReason, "Cảnh báo do mô hình tạo từ đoạn trích nguồn.") : "Không tìm thấy nguyên văn bằng chứng trong nội dung đã trích xuất; cần kiểm tra thủ công.",
    verificationHint,
    reviewStatus: "machine-only",
  };
}

export function parseSourceAuditArtifact(raw: string, sources: ExtractedSourcePacket[], context: SourceAuditParseContext = {}): ParsedSourceAuditArtifact {
  const parsed = parseJsonEnvelope(raw);
  const rawAudits = parsed && Array.isArray(parsed.sourceAudits) ? parsed.sourceAudits : [];
  const counts = new Map<number, number>();
  const byIndex = new Map<number, SourceAuditArtifact>();

  for (const item of rawAudits) {
    if (!isRecord(item) || typeof item.sourceIndex !== "number" || !Number.isInteger(item.sourceIndex)) continue;
    const sourceIndex = item.sourceIndex;
    counts.set(sourceIndex, (counts.get(sourceIndex) || 0) + 1);
    const source = sources[sourceIndex - 1];
    if (!source || byIndex.has(sourceIndex)) continue;
    const warnings = Array.isArray(item.warnings)
      ? item.warnings.map((warning) => parseWarning(warning, source)).filter((warning): warning is SourceWarningArtifact => warning !== null).slice(0, 8)
      : [];
    byIndex.set(sourceIndex, {
      sourceId: source.id,
      sourceIndex,
      sourceType: text(item.sourceType, "unknown"),
      stance: text(item.stance, "unclear"),
      stakeholderGroups: strings(item.stakeholderGroups),
      coverageTags: source.fullTextStatus === "read" || source.fullTextStatus === "partial" || source.fullTextStatus === "grounded-support"
        ? strings(item.coverageTags).filter((tag) => COVERAGE_TAGS.has(tag)).slice(0, 4)
        : [],
      warnings,
    });
  }

  const expected = sources.map((_, index) => index + 1);
  const missingSourceIndexes = expected.filter((index) => !byIndex.has(index));
  const duplicateSourceIndexes = Array.from(counts.entries()).filter(([, count]) => count > 1).map(([index]) => index).sort((a, b) => a - b);
  const providerById = new Map((context.providers || []).map((provider) => [provider.id, provider]));
  const providerAssessments = (parsed && Array.isArray(parsed.providerAssessments) ? parsed.providerAssessments : []).flatMap((item): ProviderAssessmentArtifact[] => {
    if (!isRecord(item) || typeof item.providerId !== "string") return [];
    const provider = providerById.get(item.providerId);
    if (!provider) return [];
    const reputationAssessment = REPUTATION_ASSESSMENTS.has(item.reputationAssessment as string)
      ? item.reputationAssessment as ProviderAssessmentArtifact["reputationAssessment"]
      : "unknown";
    return [{
      providerId: provider.id,
      providerName: provider.name,
      reputationAssessment,
      politicalOrientation: text(item.politicalOrientation, "Chưa xác định đủ bằng chứng"),
      ownershipAndAffiliations: strings(item.ownershipAndAffiliations, 8),
      reputationSignals: strings(item.reputationSignals, 8),
      caveats: strings(item.caveats, 8),
      verificationCitations: Array.from(new Map((context.verificationCitations || []).map((citation) => [citation.url, citation])).values()).slice(0, 8),
      reviewStatus: "machine-only",
    }];
  });
  const missingProviderIds = Array.from(providerById.keys()).filter((providerId) => !providerAssessments.some((assessment) => assessment.providerId === providerId));
  return {
    analysisMarkdown: normalizeAgentMarkdown(parsed && typeof parsed.analysisMarkdown === "string" ? parsed.analysisMarkdown : raw),
    sourceAudits: Array.from(byIndex.values()).sort((a, b) => a.sourceIndex - b.sourceIndex),
    providerAssessments,
    status: missingSourceIndexes.length === 0 && duplicateSourceIndexes.length === 0 && missingProviderIds.length === 0 ? "complete" : "incomplete",
    missingSourceIndexes,
    duplicateSourceIndexes,
    missingProviderIds,
  };
}

export function parseJudgeArtifact(raw: string, sources: ExtractedSourcePacket[]) {
  const parsed = parseJsonEnvelope(raw);
  const rawClaims = parsed && Array.isArray(parsed.claims) ? parsed.claims : [];
  const invalidIndexes = new Set<number>();
  const claims: ClaimArtifact[] = rawClaims.flatMap((item): ClaimArtifact[] => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.text !== "string") return [];
    const supportIndexes = integerIndexes(item.evidenceSourceIndexes);
    const contradictingIndexes = integerIndexes(item.contradictingSourceIndexes);
    for (const index of [...supportIndexes, ...contradictingIndexes]) if (!sources[index - 1]) invalidIndexes.add(index);
    const citations = verifiedClaimCitations(item.evidenceQuotes, sources, invalidIndexes);
    return [{
      id: item.id.trim(),
      text: item.text.trim(),
      type: CLAIM_TYPES.has(item.type as string) ? item.type as ClaimArtifact["type"] : "empirical",
      verdict: CLAIM_VERDICTS.has(item.verdict as string) ? item.verdict as ClaimArtifact["verdict"] : "unresolved",
      confidence: LEVELS.has(item.confidence as string) ? item.confidence as "low" | "medium" | "high" : "low",
      confidenceReason: text(item.confidenceReason, "Chưa có lý do confidence."),
      citations,
      contradictingSourceIds: contradictingIndexes.flatMap((index) => sources[index - 1]?.id ? [sources[index - 1].id] : []),
      unresolvedQuestions: strings(item.unresolvedQuestions),
    }];
  });
  const claimIdsWithoutEvidence = claims.filter((claim) => claim.citations.length === 0).map((claim) => claim.id);
  const reportInput = parsed
    ? typeof parsed.reportMarkdown === "string" ? parsed.reportMarkdown : ""
    : raw;
  return {
    reportMarkdown: normalizeAgentMarkdown(reportInput),
    claims,
    invalidSourceIndexes: Array.from(invalidIndexes).sort((a, b) => a - b),
    citationAudit: {
      complete: claims.length > 0 && claimIdsWithoutEvidence.length === 0 && invalidIndexes.size === 0,
      materialClaimCount: claims.length,
      citedClaimCount: claims.length - claimIdsWithoutEvidence.length,
      claimIdsWithoutEvidence,
    },
  };
}
