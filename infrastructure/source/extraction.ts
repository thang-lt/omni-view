export type SourceReadStatus = "read" | "partial" | "metadata-only" | "inaccessible";

export type SourceExtractionResult = {
  requestedUrl: string;
  finalUrl: string;
  status: SourceReadStatus;
  contentType: string | null;
  title: string | null;
  excerpt: string;
  bytesRead: number;
  redirects: number;
  error?: string;
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type SourceExtractionOptions = {
  fetchImpl?: FetchLike;
  maxRedirects?: number;
  maxBytes?: number;
  maxExcerptChars?: number;
  timeoutMs?: number;
};

const DEFAULT_MAX_REDIRECTS = 6;
const DEFAULT_MAX_BYTES = 512_000;
const DEFAULT_MAX_EXCERPT_CHARS = 20_000;
const DEFAULT_TIMEOUT_MS = 12_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function isBlockedIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) return true;
  const [a, b] = octets;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 168))
    || (a === 198 && (b === 18 || b === 19 || b === 51))
    || (a === 203 && b === 0)
    || a >= 224;
}

function isBlockedIpv6(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host.includes(":")) return false;
  if (host === "::" || host === "::1") return true;
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(host)) return true;
  // Avoid alternate spellings that can smuggle a private IPv4 literal.
  if (host.startsWith("::ffff:")) return true;
  return false;
}

export function parsePublicHttpUrl(value: string | URL): URL {
  let url: URL;
  try {
    url = value instanceof URL ? new URL(value.toString()) : new URL(value);
  } catch {
    throw new Error("Invalid source URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https source URLs are allowed");
  }
  if (url.username || url.password) throw new Error("Source URLs must not contain credentials");

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Blocked local source host");
  }
  if (isBlockedIpv4(hostname) || isBlockedIpv6(hostname)) {
    throw new Error("Blocked private or reserved source host");
  }
  return url;
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (match, entity: string) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? match;
    const radix = entity[1]?.toLowerCase() === "x" ? 16 : 10;
    const raw = entity.slice(radix === 16 ? 2 : 1);
    const codePoint = Number.parseInt(raw, radix);
    try { return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match; } catch { return match; }
  });
}

function cleanWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function htmlToReadableText(html: string): { title: string | null; text: string } {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const title = titleMatch ? cleanWhitespace(decodeEntities(titleMatch[1].replace(/<[^>]*>/g, " "))) || null : null;
  const text = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|main|article|section|header|footer|aside|li|h[1-6]|tr)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
  return { title, text: cleanWhitespace(decodeEntities(text)) };
}

function isReadableContentType(contentType: string): boolean {
  return contentType === "text/html"
    || contentType === "application/xhtml+xml"
    || contentType === "application/json"
    || contentType.startsWith("text/");
}

async function readBounded(response: Response, maxBytes: number): Promise<{ text: string; bytesRead: number; partial: boolean }> {
  if (!response.body) return { text: "", bytesRead: 0, partial: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  let partial = Number(response.headers.get("content-length")) > maxBytes;

  try {
    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maxBytes - bytesRead;
      if (value.byteLength > remaining) {
        chunks.push(value.subarray(0, remaining));
        bytesRead += remaining;
        partial = true;
        await reader.cancel("source byte limit reached");
        break;
      }
      chunks.push(value);
      bytesRead += value.byteLength;
    }
    if (bytesRead === maxBytes && !partial) {
      const next = await reader.read();
      if (!next.done) {
        partial = true;
        await reader.cancel("source byte limit reached");
      }
    }
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(output), bytesRead, partial };
}

function inaccessible(requestedUrl: string, finalUrl: string, redirects: number, error: unknown): SourceExtractionResult {
  return {
    requestedUrl,
    finalUrl,
    status: "inaccessible",
    contentType: null,
    title: null,
    excerpt: "",
    bytesRead: 0,
    redirects,
    error: error instanceof Error ? error.message : "Source is inaccessible",
  };
}

export async function extractSource(input: string, options: SourceExtractionOptions = {}): Promise<SourceExtractionResult> {
  const requestedUrl = input;
  let current: URL;
  try {
    current = parsePublicHttpUrl(input);
  } catch (error) {
    return inaccessible(requestedUrl, requestedUrl, 0, error);
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRedirects = Math.max(0, options.maxRedirects ?? DEFAULT_MAX_REDIRECTS);
  const maxBytes = Math.max(1, options.maxBytes ?? DEFAULT_MAX_BYTES);
  const maxExcerptChars = Math.max(1, options.maxExcerptChars ?? DEFAULT_MAX_EXCERPT_CHARS);
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let redirects = 0;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Source request timed out")), timeoutMs);

  try {
    while (true) {
      let response: Response;
      try {
        response = await fetchImpl(current, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "accept": "text/html, application/xhtml+xml, text/plain, text/markdown, application/json;q=0.8",
            "accept-language": "vi,en;q=0.8",
            "user-agent": "DaChieuResearchDesk/0.1 (bounded research source reader)",
          },
        });
      } catch (error) {
        return inaccessible(requestedUrl, current.toString(), redirects, error);
      }

      if (REDIRECT_STATUSES.has(response.status)) {
        await response.body?.cancel();
        if (redirects >= maxRedirects) {
          return inaccessible(requestedUrl, current.toString(), redirects, new Error("Source redirect limit exceeded"));
        }
        const location = response.headers.get("location");
        if (!location) return inaccessible(requestedUrl, current.toString(), redirects, new Error("Source redirect is missing a location"));
        try {
          current = parsePublicHttpUrl(new URL(location, current));
        } catch (error) {
          return inaccessible(requestedUrl, current.toString(), redirects, error);
        }
        redirects += 1;
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        return inaccessible(requestedUrl, current.toString(), redirects, new Error(`Source returned HTTP ${response.status}`));
      }

      const contentType = (response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
      if (!contentType || !isReadableContentType(contentType)) {
        await response.body?.cancel();
        return {
          requestedUrl,
          finalUrl: current.toString(),
          status: "metadata-only",
          contentType: contentType || null,
          title: null,
          excerpt: "",
          bytesRead: 0,
          redirects,
        };
      }

      const body = await readBounded(response, maxBytes);
      const readable = contentType === "text/html" || contentType === "application/xhtml+xml"
        ? htmlToReadableText(body.text)
        : { title: null, text: cleanWhitespace(body.text) };
      const excerptTruncated = readable.text.length > maxExcerptChars;
      return {
        requestedUrl,
        finalUrl: current.toString(),
        status: body.partial || excerptTruncated ? "partial" : readable.text ? "read" : "metadata-only",
        contentType,
        title: readable.title,
        excerpt: readable.text.slice(0, maxExcerptChars),
        bytesRead: body.bytesRead,
        redirects,
      };
    }
  } finally {
    clearTimeout(timeout);
  }
}
