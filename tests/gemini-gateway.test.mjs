import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGeminiGenerationConfig,
  shouldFallbackToJsonMode,
  shouldRetryGeminiStatus,
  validateGeminiGatewayRequest,
} from "../infrastructure/gemini/request.ts";

test("gateway accepts bounded research requests and normalizes token limits", () => {
  const result = validateGeminiGatewayRequest({ prompt: "Research this claim", useSearch: true, maxOutputTokens: 99999 });
  assert.equal(result.prompt, "Research this claim");
  assert.equal(result.useSearch, true);
  assert.equal(result.maxOutputTokens, 3000);
});

test("gateway retries only transient upstream statuses", () => {
  assert.equal(shouldRetryGeminiStatus(429), true);
  assert.equal(shouldRetryGeminiStatus(503), true);
  assert.equal(shouldRetryGeminiStatus(400), false);
  assert.equal(shouldRetryGeminiStatus(401), false);
});

test("gateway falls back to JSON mode only when Gemini rejects a response schema", () => {
  const invalidSchema = { error: { status: "INVALID_ARGUMENT", message: "Request contains an invalid argument." } };
  assert.equal(shouldFallbackToJsonMode(400, invalidSchema, true), true);
  assert.equal(shouldFallbackToJsonMode(400, invalidSchema, false), false);
  assert.equal(shouldFallbackToJsonMode(401, invalidSchema, true), false);
  assert.equal(shouldFallbackToJsonMode(400, { error: { status: "PERMISSION_DENIED" } }, true), false);
});

test("JSON fallback preserves JSON output but removes the rejected schema", () => {
  const responseSchema = { type: "object", properties: { result: { type: "string" } } };
  const strict = buildGeminiGenerationConfig(900, responseSchema);
  assert.equal(strict.responseMimeType, "application/json");
  assert.deepEqual(strict.responseSchema, responseSchema);

  const fallback = buildGeminiGenerationConfig(900);
  assert.equal(fallback.responseMimeType, "application/json");
  assert.equal("responseSchema" in fallback, false);
});

test("gateway rejects empty, oversized, or malformed requests", () => {
  assert.throws(() => validateGeminiGatewayRequest({ prompt: "" }));
  assert.throws(() => validateGeminiGatewayRequest({ prompt: "x".repeat(50_001) }));
  assert.throws(() => validateGeminiGatewayRequest({ prompt: "ok", responseSchema: [] }));
  assert.throws(() => validateGeminiGatewayRequest({ prompt: "ok", responseSchema: { value: "x".repeat(20_001) } }));
});
