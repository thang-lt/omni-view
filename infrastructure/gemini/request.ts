export type GeminiGatewayRequest = {
  prompt: string;
  useSearch: boolean;
  maxOutputTokens: number;
  responseSchema?: Record<string, unknown>;
};

export function shouldRetryGeminiStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function shouldFallbackToJsonMode(status: number, payload: unknown, hasResponseSchema: boolean): boolean {
  if (!hasResponseSchema || status !== 400 || typeof payload !== "object" || payload === null || Array.isArray(payload)) return false;
  const error = (payload as Record<string, unknown>).error;
  if (typeof error !== "object" || error === null || Array.isArray(error)) return false;
  const detail = error as Record<string, unknown>;
  return detail.status === "INVALID_ARGUMENT"
    || (typeof detail.message === "string" && detail.message.toLocaleLowerCase().includes("invalid argument"));
}

export function buildGeminiGenerationConfig(maxOutputTokens: number, responseSchema?: Record<string, unknown>) {
  return {
    maxOutputTokens,
    thinkingConfig: { thinkingLevel: "minimal" },
    responseMimeType: "application/json",
    ...(responseSchema ? { responseSchema } : {}),
  };
}

export function validateGeminiGatewayRequest(value: unknown): GeminiGatewayRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Request must be an object");
  const input = value as Record<string, unknown>;
  if (typeof input.prompt !== "string" || input.prompt.trim().length === 0) throw new Error("prompt is required");
  const prompt = input.prompt.trim();
  if (prompt.length > 50_000) throw new Error("prompt exceeds 50000 characters");
  if (input.responseSchema !== undefined && (typeof input.responseSchema !== "object" || input.responseSchema === null || Array.isArray(input.responseSchema))) {
    throw new Error("responseSchema must be an object");
  }
  if (input.responseSchema && JSON.stringify(input.responseSchema).length > 20_000) throw new Error("responseSchema exceeds 20000 characters");
  const requestedTokens = typeof input.maxOutputTokens === "number" && Number.isFinite(input.maxOutputTokens) ? Math.floor(input.maxOutputTokens) : 1100;
  return {
    prompt,
    useSearch: input.useSearch === true,
    maxOutputTokens: Math.min(3000, Math.max(200, requestedTokens)),
    ...(input.responseSchema ? { responseSchema: input.responseSchema as Record<string, unknown> } : {}),
  };
}
