export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseJsonEnvelope(text: string): Record<string, unknown> | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const candidates = [trimmed];
  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (isRecord(parsed)) return parsed;
    } catch { /* try the next JSON envelope */ }
  }
  return null;
}

export function extractJsonStringField(text: string, field: string): string | null {
  const marker = new RegExp(`"${field}"\\s*:\\s*"`).exec(text);
  if (!marker) return null;
  const start = marker.index + marker[0].length;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && !escaped) {
      const rawValue = text.slice(start, index);
      try { return JSON.parse(`"${rawValue}"`) as string; }
      catch { return rawValue.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"'); }
    }
    escaped = character === "\\" ? !escaped : false;
  }
  return null;
}

export function normalizeAgentMarkdown(text: string): string {
  const envelope = parseJsonEnvelope(text);
  const structuredMarkdown = ["analysisMarkdown", "reportMarkdown"]
    .map((field) => envelope?.[field])
    .find((value): value is string => typeof value === "string");
  const extractedMarkdown = ["analysisMarkdown", "reportMarkdown"]
    .map((field) => extractJsonStringField(text, field))
    .find((value): value is string => typeof value === "string");
  const source = structuredMarkdown || extractedMarkdown || text;
  let normalized = source.trim();
  const fencedMarkdown = normalized.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMarkdown) normalized = fencedMarkdown[1].trim();
  if (normalized.includes("\\n") || normalized.includes("\\r") || normalized.includes("\\t")) {
    normalized = normalized.replace(/\\r\\n|\\n|\\r/g, "\n").replace(/\\t/g, "\t");
  }
  return normalized
    .replace(/^(#{1,6})([^\s#])/gm, "$1 $2")
    .replace(/^([-+*])(?=\S)/gm, "$1 ")
    .replace(/^(\d+[.)])(?=\S)/gm, "$1 ")
    .replace(/^>(?=\S)/gm, "> ")
    .trim();
}
