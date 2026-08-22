import {
  buildGeminiGenerationConfig,
  shouldFallbackToJsonMode,
  shouldRetryGeminiStatus,
  validateGeminiGatewayRequest,
} from "../../../../infrastructure/gemini/request.ts";
import { extractSource } from "../../../../infrastructure/source/extraction.ts";
import { collectGroundingSupportExcerpts, type GroundingCandidate } from "../../../../infrastructure/gemini/grounding-support.ts";

const MODEL = "gemini-3.5-flash-lite";
const GEMINI_DEBUG_LOGS = process.env.NODE_ENV === "development";

function printGatewayDebug(operation: string, requestId: string, stage: "REQUEST" | "RESPONSE" | "ERROR", value: unknown) {
  if (!GEMINI_DEBUG_LOGS) return;
  const label = `[Gemini Gateway][${requestId}][${operation}][${stage}]`;
  if (stage === "ERROR") console.error(label, value);
  else console.log(label, value);
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 80_000) return Response.json({ error: { message: "Request body is too large" } }, { status: 413 });
  const apiKey = request.headers.get("x-gemini-api-key")?.trim();
  if (!apiKey || apiKey.length < 20) return Response.json({ error: { message: "Gemini API key is missing or incomplete" } }, { status: 401 });

  let input;
  try {
    input = validateGeminiGatewayRequest(await request.json());
  } catch (error) {
    return Response.json({ error: { message: error instanceof Error ? error.message : "Invalid request" } }, { status: 400 });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  printGatewayDebug(input.operation, requestId, "REQUEST", {
    prompt: input.prompt,
    useSearch: input.useSearch,
    extractSources: input.extractSources,
    maxOutputTokens: input.maxOutputTokens,
    responseSchema: input.responseSchema,
  });

  try {
    const buildRequestBody = (responseSchema: Record<string, unknown> | undefined, forceJson: boolean) => JSON.stringify({
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      ...(input.useSearch ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: forceJson
        ? buildGeminiGenerationConfig(input.maxOutputTokens, responseSchema)
        : {
        maxOutputTokens: input.maxOutputTokens,
        thinkingConfig: { thinkingLevel: "minimal" },
      },
    });

    const callUpstream = async (body: string) => {
      let response: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          signal: AbortSignal.timeout(30_000),
          body,
        });
        if (!shouldRetryGeminiStatus(response.status) || attempt === 2) break;
        await response.body?.cancel();
        await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** attempt) + Math.floor(Math.random() * 150)));
      }
      if (!response) throw new Error("Gemini upstream did not return a response");
      return response;
    };

    type GeminiPayload = {
      error?: { status?: string; message?: string };
      candidates?: GroundingCandidate[];
      [key: string]: unknown;
    };
    let upstream = await callUpstream(buildRequestBody(input.responseSchema, Boolean(input.responseSchema)));
    let payload = await upstream.json().catch(() => ({})) as GeminiPayload;
    if (shouldFallbackToJsonMode(upstream.status, payload, Boolean(input.responseSchema))) {
      upstream = await callUpstream(buildRequestBody(undefined, true));
      payload = await upstream.json().catch(() => ({})) as GeminiPayload;
    }
    if (upstream.ok && input.useSearch && input.extractSources) {
      const candidate = payload.candidates?.[0];
      const chunks = candidate?.groundingMetadata?.groundingChunks || [];
      const groundingExcerpts = collectGroundingSupportExcerpts(candidate);
      const chunksByUrl = new Map<string, { url: string; groundingExcerpt: string }>();
      for (const [index, chunk] of chunks.entries()) {
        const url = chunk.web?.uri;
        if (typeof url !== "string") continue;
        const current = chunksByUrl.get(url);
        const nextExcerpt = groundingExcerpts[index] || "";
        const groundingExcerpt = current?.groundingExcerpt && nextExcerpt && !current.groundingExcerpt.includes(nextExcerpt)
          ? `${current.groundingExcerpt}\n\n${nextExcerpt}`.slice(0, 3_000)
          : current?.groundingExcerpt || nextExcerpt;
        chunksByUrl.set(url, { url, groundingExcerpt });
      }
      const uniqueChunks = Array.from(chunksByUrl.values());
      const sourceExtractions = [];
      const extractionConcurrency = 4;
      for (let start = 0; start < uniqueChunks.length; start += extractionConcurrency) {
        sourceExtractions.push(...await Promise.all(uniqueChunks.slice(start, start + extractionConcurrency).map(async ({ url, groundingExcerpt }) => ({
          ...await extractSource(url, { maxExcerptChars: 3_000, maxRedirects: 6 }),
          groundingExcerpt,
        }))));
      }
      payload.sourceExtractions = sourceExtractions;
    }
    printGatewayDebug(input.operation, requestId, "RESPONSE", { httpStatus: upstream.status, payload });
    return Response.json(payload, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    printGatewayDebug(input.operation, requestId, "ERROR", error);
    return Response.json({ error: { message: "Không thể kết nối Gemini từ research gateway" } }, { status: 502 });
  }
}
