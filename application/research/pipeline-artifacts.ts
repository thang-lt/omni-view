import { isRecord, normalizeAgentMarkdown, parseJsonEnvelope } from "../../lib/research-format.ts";

export type ExtractedSourcePacket = {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  locator: string;
  fullTextStatus: "read" | "partial" | "grounded-support" | "metadata-only" | "inaccessible";
  evidencePassages?: EvidencePassage[];
};

export type EvidencePassage = {
  kind: "direct" | "grounding-support";
  text: string;
  locator: string;
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
  evidenceLocator?: string;
  evidenceProvenance?: EvidencePassage["kind"];
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

export type PerspectiveArtifact = {
  perspectives: Array<{
    id: string;
    thesis: string;
    sourceIds: string[];
    stakeholderGroups: string[];
    assumptions: string[];
    omissions: string[];
    strongestCounterargument: string;
  }>;
  blindSpots: string[];
  markdown: string;
};

export type ClaimArtifact = {
  id: string;
  text: string;
  type: "empirical" | "causal" | "predictive" | "interpretive" | "normative";
  verdict: "supported" | "mixed" | "unsupported" | "unresolved";
  confidence: "low" | "medium" | "high";
  confidenceReason: string;
  citations: Array<{
    relationship: "supports" | "contradicts" | "context";
    sourceId: string;
    locator: string;
    quote: string;
    textMatchVerified: true;
    provenance: EvidencePassage["kind"];
  }>;
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

export function evidencePassagesForSource(source: ExtractedSourcePacket): EvidencePassage[] {
  const passages = (source.evidencePassages || []).filter((passage) => passage.text.trim().length > 0);
  if (passages.length > 0) return passages;
  if (!source.excerpt.trim()) return [];
  return [{
    kind: source.fullTextStatus === "grounded-support" ? "grounding-support" : "direct",
    text: source.excerpt,
    locator: source.locator,
  }];
}

export function locateEvidenceQuote(source: ExtractedSourcePacket, rawQuote: string, minimumLength = 1) {
  const quote = rawQuote.trim();
  if (quote.length < minimumLength) return null;
  for (const passage of evidencePassagesForSource(source)) {
    const characterIndex = passage.text.toLocaleLowerCase().indexOf(quote.toLocaleLowerCase());
    if (characterIndex >= 0) {
      return {
        quote,
        locator: `${passage.locator}, character ${characterIndex}`,
        provenance: passage.kind,
      } as const;
    }
  }
  return null;
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
    const locatedEvidence = locateEvidenceQuote(source, item.quote, 20);
    if (!locatedEvidence) return [];
    const relationship = item.relationship === "contradicts" || item.relationship === "context" ? item.relationship : "supports";
    return [{
      relationship,
      sourceId: source.id,
      locator: locatedEvidence.locator,
      quote: locatedEvidence.quote,
      textMatchVerified: true,
      provenance: locatedEvidence.provenance,
    }];
  });
}

export function buildEvidencePacket(sources: ExtractedSourcePacket[], sourceIndexOffset = 0): string {
  const untrustedSources = sources.map((source, index) => ({
    sourceIndex: sourceIndexOffset + index + 1,
    id: source.id,
    title: source.title,
    url: source.url,
    fullTextStatus: source.fullTextStatus,
    evidencePassages: evidencePassagesForSource(source).map((passage) => ({
      kind: passage.kind,
      locator: passage.locator,
      content: passage.text,
    })),
  }));
  return `<UNTRUSTED_SOURCE_DATA_JSON>\n${JSON.stringify({ untrustedSources })}\n</UNTRUSTED_SOURCE_DATA_JSON>`;
}

export function parsePerspectiveArtifact(raw: string, sources: ExtractedSourcePacket[]): PerspectiveArtifact {
  const parsed = parseJsonEnvelope(raw);
  const perspectives = (parsed && Array.isArray(parsed.perspectives) ? parsed.perspectives : []).flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const thesis = text(item.thesis);
    if (!thesis) return [];
    const sourceIds = integerIndexes(item.sourceIndexes).flatMap((sourceIndex) => sources[sourceIndex - 1]?.id ? [sources[sourceIndex - 1].id] : []);
    return [{
      id: text(item.id, `V${index + 1}`),
      thesis,
      sourceIds: Array.from(new Set(sourceIds)),
      stakeholderGroups: strings(item.stakeholderGroups, 6),
      assumptions: strings(item.assumptions, 5),
      omissions: strings(item.omissions, 5),
      strongestCounterargument: text(item.strongestCounterargument, "Chưa có phản biện đủ dữ liệu."),
    }];
  }).slice(0, 4);
  const blindSpots = strings(parsed?.blindSpots, 6);
  const markdown = [
    ...perspectives.map((perspective) => [
      `### ${perspective.id} · ${perspective.thesis}`,
      `- **Nguồn liên quan:** ${perspective.sourceIds.join(", ") || "Chưa có nguồn hợp lệ"}`,
      `- **Stakeholder:** ${perspective.stakeholderGroups.join(", ") || "Chưa xác định"}`,
      `- **Giả định:** ${perspective.assumptions.join("; ") || "Chưa xác định"}`,
      `- **Điểm có thể bị bỏ sót:** ${perspective.omissions.join("; ") || "Chưa xác định"}`,
      `- **Phản biện mạnh nhất:** ${perspective.strongestCounterargument}`,
    ].join("\n")),
    blindSpots.length ? `### Điểm mù còn lại\n${blindSpots.map((gap) => `- ${gap}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  return { perspectives, blindSpots, markdown };
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

  const locatedEvidence = locateEvidenceQuote(source, evidenceQuote, 20);
  const evidenceVerified = Boolean(locatedEvidence);
  const requestedConfidence = LEVELS.has(value.confidence as string) ? value.confidence as "low" | "medium" | "high" : "low";
  const requestedSeverity = SEVERITIES.has(value.severity as string) ? value.severity as "info" | "low" | "medium" | "high" : "info";
  return {
    category,
    observableIndicator,
    evidenceQuote,
    evidenceVerified,
    ...(locatedEvidence ? { evidenceLocator: locatedEvidence.locator, evidenceProvenance: locatedEvidence.provenance } : {}),
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
    const allowedVerificationCitations = new Map((context.verificationCitations || []).map((citation) => [citation.url, citation]));
    const requestedVerificationUrls = strings(item.verificationCitationUrls, 8);
    return [{
      providerId: provider.id,
      providerName: provider.name,
      reputationAssessment,
      politicalOrientation: text(item.politicalOrientation, "Chưa xác định đủ bằng chứng"),
      ownershipAndAffiliations: strings(item.ownershipAndAffiliations, 8),
      reputationSignals: strings(item.reputationSignals, 8),
      caveats: strings(item.caveats, 8),
      verificationCitations: requestedVerificationUrls.flatMap((url) => {
        const citation = allowedVerificationCitations.get(url);
        return citation ? [citation] : [];
      }),
      reviewStatus: "machine-only",
    }];
  });
  const missingProviderIds = Array.from(providerById.keys()).filter((providerId) => !providerAssessments.some((assessment) => assessment.providerId === providerId));
  return {
    analysisMarkdown: normalizeAgentMarkdown(parsed ? typeof parsed.analysisMarkdown === "string" ? parsed.analysisMarkdown : "" : raw),
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
  const seenClaimIds = new Set<string>();
  const claims: ClaimArtifact[] = rawClaims.flatMap((item): ClaimArtifact[] => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.text !== "string") return [];
    const id = item.id.trim();
    const claimText = item.text.trim();
    if (!id || !claimText || seenClaimIds.has(id)) return [];
    seenClaimIds.add(id);
    const legacyEvidenceLinks = Array.isArray(item.evidenceQuotes)
      ? item.evidenceQuotes.map((link) => isRecord(link) ? { ...link, relationship: "supports" } : link)
      : [];
    const rawEvidenceLinks = Array.isArray(item.evidenceLinks) ? item.evidenceLinks : legacyEvidenceLinks;
    for (const link of rawEvidenceLinks) {
      if (isRecord(link) && typeof link.sourceIndex === "number" && Number.isInteger(link.sourceIndex) && !sources[link.sourceIndex - 1]) invalidIndexes.add(link.sourceIndex);
    }
    const citations = verifiedClaimCitations(rawEvidenceLinks, sources, invalidIndexes);
    const hasSupport = citations.some((citation) => citation.relationship === "supports");
    const hasContradiction = citations.some((citation) => citation.relationship === "contradicts");
    const requestedVerdict = CLAIM_VERDICTS.has(item.verdict as string) ? item.verdict as ClaimArtifact["verdict"] : "unresolved";
    const verdictHasRequiredEvidence = requestedVerdict === "unresolved"
      || (requestedVerdict === "supported" && hasSupport)
      || (requestedVerdict === "unsupported" && hasContradiction)
      || (requestedVerdict === "mixed" && hasSupport && hasContradiction);
    const verdict = verdictHasRequiredEvidence ? requestedVerdict : "unresolved";
    const requestedConfidence = LEVELS.has(item.confidence as string) ? item.confidence as "low" | "medium" | "high" : "low";
    const substantiveEvidence = citations.filter((citation) => citation.relationship !== "context");
    const groundedOnly = substantiveEvidence.length > 0 && substantiveEvidence.every((citation) => citation.provenance === "grounding-support");
    const confidence = !verdictHasRequiredEvidence ? "low" : groundedOnly && requestedConfidence === "high" ? "medium" : requestedConfidence;
    const confidenceReason = !verdictHasRequiredEvidence
      ? `${text(item.confidenceReason, "Chưa có đủ bằng chứng.")} Verdict được hạ về unresolved vì thiếu quote ${requestedVerdict === "mixed" ? "hỗ trợ hoặc phản chứng" : requestedVerdict === "unsupported" ? "phản chứng" : "hỗ trợ"} đã kiểm tra.`
      : groundedOnly && requestedConfidence === "high"
        ? `${text(item.confidenceReason, "Bằng chứng có grounding.")} Confidence được giới hạn ở medium vì chỉ có grounding-support model-generated.`
        : text(item.confidenceReason, "Chưa có lý do confidence.");
    return [{
      id,
      text: claimText,
      type: CLAIM_TYPES.has(item.type as string) ? item.type as ClaimArtifact["type"] : "empirical",
      verdict,
      confidence,
      confidenceReason,
      citations,
      contradictingSourceIds: Array.from(new Set(citations.filter((citation) => citation.relationship === "contradicts").map((citation) => citation.sourceId))),
      unresolvedQuestions: strings(item.unresolvedQuestions),
    }];
  });
  const claimIdsWithoutEvidence = claims.filter((claim) => claim.verdict !== "unresolved" && claim.citations.every((citation) => citation.relationship === "context")).map((claim) => claim.id);
  const citedClaimCount = claims.filter((claim) => claim.citations.some((citation) => citation.relationship !== "context")).length;
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
      citedClaimCount,
      claimIdsWithoutEvidence,
    },
  };
}
