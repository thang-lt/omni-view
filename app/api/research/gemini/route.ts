import {
  buildGeminiGenerationConfig,
  shouldFallbackToJsonMode,
  shouldRetryGeminiStatus,
  validateGeminiGatewayRequest,
} from "../../../../infrastructure/gemini/request";
import { extractSource } from "../../../../infrastructure/source/extraction";

const MODEL = "gemini-3.5-flash-lite";

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
      candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string } }> } }>;
      [key: string]: unknown;
    };
    let upstream = await callUpstream(buildRequestBody(input.responseSchema, Boolean(input.responseSchema)));
    let payload = await upstream.json().catch(() => ({})) as GeminiPayload;
    if (shouldFallbackToJsonMode(upstream.status, payload, Boolean(input.responseSchema))) {
      upstream = await callUpstream(buildRequestBody(undefined, true));
      payload = await upstream.json().catch(() => ({})) as GeminiPayload;
    }
    if (upstream.ok && input.useSearch) {
      const groundedUrls = Array.from(new Set((payload.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
        .map((chunk) => chunk.web?.uri)
        .filter((url): url is string => typeof url === "string"))).slice(0, 8);
      const sourceExtractions = await Promise.all(groundedUrls.map((url) => extractSource(url, { maxExcerptChars: 3_000 })));
      payload.sourceExtractions = sourceExtractions;
    }
    return Response.json(payload, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: { message: "Không thể kết nối Gemini từ research gateway" } }, { status: 502 });
  }
}
