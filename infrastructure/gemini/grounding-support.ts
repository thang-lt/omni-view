type GroundingSegment = {
  text?: string;
  startIndex?: number;
  endIndex?: number;
};

type GroundingSupport = {
  segment?: GroundingSegment;
  groundingChunkIndices?: number[];
};

export type GroundingCandidate = {
  content?: { parts?: Array<{ text?: string }> };
  groundingMetadata?: {
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    groundingSupports?: GroundingSupport[];
  };
};

function normalizeSegment(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function segmentText(candidateText: string, segment?: GroundingSegment): string {
  const explicit = typeof segment?.text === "string" ? normalizeSegment(segment.text) : "";
  if (explicit) return explicit;
  if (!Number.isInteger(segment?.startIndex) || !Number.isInteger(segment?.endIndex)) return "";
  const start = Math.max(0, segment?.startIndex ?? 0);
  const end = Math.max(start, segment?.endIndex ?? start);
  return normalizeSegment(candidateText.slice(start, end));
}

/**
 * Builds one model-generated, Google-grounded support excerpt per grounding chunk.
 * These excerpts are deliberately kept separate from directly extracted source text.
 */
export function collectGroundingSupportExcerpts(candidate: GroundingCandidate | undefined, maxChars = 3_000): string[] {
  const chunks = candidate?.groundingMetadata?.groundingChunks || [];
  const supports = candidate?.groundingMetadata?.groundingSupports || [];
  const candidateText = (candidate?.content?.parts || []).map((part) => part.text || "").join("\n");
  const byChunk = chunks.map(() => new Set<string>());

  for (const support of supports) {
    const excerpt = segmentText(candidateText, support.segment);
    if (!excerpt) continue;
    for (const chunkIndex of support.groundingChunkIndices || []) {
      if (Number.isInteger(chunkIndex) && byChunk[chunkIndex]) byChunk[chunkIndex].add(excerpt);
    }
  }

  return byChunk.map((segments) => Array.from(segments).join("\n\n").slice(0, Math.max(1, maxChars)));
}
