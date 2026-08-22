export type GeminiGatewayRequest = {
  operation: "balanced-scout" | "counter-scout" | "perspective" | "provider-verification" | "audit" | "judge-claims" | "judge-report" | "unknown";
  prompt: string;
  useSearch: boolean;
  extractSources: boolean;
  maxOutputTokens: number;
  responseSchema?: Record<string, unknown>;
};

const GEMINI_OPERATIONS = new Set(["balanced-scout", "counter-scout", "perspective", "provider-verification", "audit", "judge-claims", "judge-report"]);

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
  if (input.operation !== undefined && (typeof input.operation !== "string" || !GEMINI_OPERATIONS.has(input.operation))) throw new Error("operation is invalid");
  if (typeof input.prompt !== "string" || input.prompt.trim().length === 0) throw new Error("prompt is required");
  const prompt = input.prompt.trim();
  if (prompt.length > 50_000) throw new Error("prompt exceeds 50000 characters");
  if (input.responseSchema !== undefined && (typeof input.responseSchema !== "object" || input.responseSchema === null || Array.isArray(input.responseSchema))) {
    throw new Error("responseSchema must be an object");
  }
  if (input.responseSchema && JSON.stringify(input.responseSchema).length > 20_000) throw new Error("responseSchema exceeds 20000 characters");
  const requestedTokens = typeof input.maxOutputTokens === "number" && Number.isFinite(input.maxOutputTokens) ? Math.floor(input.maxOutputTokens) : 1100;
  return {
    operation: typeof input.operation === "string" ? input.operation as GeminiGatewayRequest["operation"] : "unknown",
    prompt,
    useSearch: input.useSearch === true,
    extractSources: input.extractSources !== false,
    maxOutputTokens: Math.min(3000, Math.max(200, requestedTokens)),
    ...(input.responseSchema ? { responseSchema: input.responseSchema as Record<string, unknown> } : {}),
  };
}
