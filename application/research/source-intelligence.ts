/**
 * Pure research-intelligence services. These functions intentionally have no
 * storage, network, framework, or model dependencies so orchestration can use
 * them on either side of the browser/server boundary.
 */

export type SourceForClustering = {
  id: string;
  url: string;
  upstreamSourceIds?: readonly string[];
  contentFingerprint?: string | null;
};

export type SourceFamily = {
  id: string;
  sourceIds: string[];
  rootSourceId: string;
  canonicalUrls: string[];
};

const TRACKING_PARAMETER = /^(utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|ref_src)$/i;

export function canonicalizeSourceUrl(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";

  const parameters = Array.from(url.searchParams.entries())
    .filter(([name]) => !TRACKING_PARAMETER.test(name))
    .sort(([leftName, leftValue], [rightName, rightValue]) => leftName.localeCompare(rightName) || leftValue.localeCompare(rightValue));
  url.search = "";
  for (const [name, value] of parameters) url.searchParams.append(name, value);

  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${pathname}${url.search}`;
}

export function clusterSourceFamilies(sources: readonly SourceForClustering[]): SourceFamily[] {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const parent = new Map(sources.map((source) => [source.id, source.id]));

  const find = (id: string): string => {
    const current = parent.get(id);
    if (!current || current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };
  const unite = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot === rightRoot) return;
    const [first, second] = [leftRoot, rightRoot].sort();
    parent.set(second, first);
  };

  const seenUrls = new Map<string, string>();
  const seenFingerprints = new Map<string, string>();
  for (const source of sources) {
    const canonicalUrl = canonicalizeSourceUrl(source.url);
    if (canonicalUrl) {
      const equivalent = seenUrls.get(canonicalUrl);
      if (equivalent) unite(source.id, equivalent);
      else seenUrls.set(canonicalUrl, source.id);
    }
    const fingerprint = source.contentFingerprint?.trim();
    if (fingerprint) {
      const copy = seenFingerprints.get(fingerprint);
      if (copy) unite(source.id, copy);
      else seenFingerprints.set(fingerprint, source.id);
    }
    for (const upstreamId of source.upstreamSourceIds ?? []) {
      if (byId.has(upstreamId)) unite(source.id, upstreamId);
    }
  }

  const groups = new Map<string, string[]>();
  for (const source of sources) {
    const root = find(source.id);
    groups.set(root, [...(groups.get(root) ?? []), source.id]);
  }

  return Array.from(groups.values())
    .map((sourceIds): SourceFamily => {
      sourceIds.sort();
      const inboundCount = new Map(sourceIds.map((id) => [id, 0]));
      for (const id of sourceIds) {
        for (const upstreamId of byId.get(id)?.upstreamSourceIds ?? []) {
          if (inboundCount.has(upstreamId)) inboundCount.set(upstreamId, (inboundCount.get(upstreamId) ?? 0) + 1);
        }
      }
      const rootSourceId = [...sourceIds].sort((left, right) =>
        (inboundCount.get(right) ?? 0) - (inboundCount.get(left) ?? 0) || left.localeCompare(right),
      )[0];
      const canonicalUrls = Array.from(new Set(sourceIds.flatMap((id) => {
        const canonical = canonicalizeSourceUrl(byId.get(id)?.url ?? "");
        return canonical ? [canonical] : [];
      }))).sort();
      return { id: `family:${sourceIds.join("|")}`, sourceIds, rootSourceId, canonicalUrls };
    })
    .sort((left, right) => left.sourceIds[0].localeCompare(right.sourceIds[0]));
}

export type ClaimCitation = { sourceId?: string | null; locator?: string | null };
export type ClaimForCitationAudit = { id: string; isMaterial?: boolean; citations?: readonly ClaimCitation[] };
export type CitationAuditFinding = {
  claimId: string;
  code: "missing_citation" | "unknown_source" | "missing_locator";
  citationIndexes: number[];
};

export function auditCitationCompleteness(claims: readonly ClaimForCitationAudit[], sources: readonly { id: string }[]) {
  const knownSourceIds = new Set(sources.map((source) => source.id));
  const materialClaims = claims.filter((claim) => claim.isMaterial !== false);
  const findings: CitationAuditFinding[] = [];
  let completeMaterialClaimCount = 0;

  for (const claim of materialClaims) {
    const citations = claim.citations ?? [];
    if (citations.length === 0) {
      findings.push({ claimId: claim.id, code: "missing_citation", citationIndexes: [] });
      continue;
    }
    const unknownSourceIndexes: number[] = [];
    const missingLocatorIndexes: number[] = [];
    let hasCompleteCitation = false;
    citations.forEach((citation, index) => {
      const sourceIsKnown = Boolean(citation.sourceId && knownSourceIds.has(citation.sourceId));
      const hasLocator = Boolean(citation.locator?.trim());
      if (!sourceIsKnown) unknownSourceIndexes.push(index);
      else if (!hasLocator) missingLocatorIndexes.push(index);
      else hasCompleteCitation = true;
    });
    if (unknownSourceIndexes.length > 0) findings.push({ claimId: claim.id, code: "unknown_source", citationIndexes: unknownSourceIndexes });
    if (missingLocatorIndexes.length > 0) findings.push({ claimId: claim.id, code: "missing_locator", citationIndexes: missingLocatorIndexes });
    if (hasCompleteCitation) completeMaterialClaimCount += 1;
  }

  findings.sort((left, right) => left.claimId.localeCompare(right.claimId) || left.code.localeCompare(right.code));
  const materialClaimCount = materialClaims.length;
  return {
    complete: materialClaimCount === completeMaterialClaimCount && findings.length === 0,
    materialClaimCount,
    completeMaterialClaimCount,
    completenessRatio: materialClaimCount === 0 ? 1 : completeMaterialClaimCount / materialClaimCount,
    findings,
  };
}
