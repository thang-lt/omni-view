import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../app/api/research/gemini/route.ts";

test("gateway preserves grounding support when direct source fetch fails", async () => {
  const originalFetch = globalThis.fetch;
  const sourceUrls = Array.from({ length: 9 }, (_, index) => `https://source${index + 1}.example/report`);
  let sourceFetchCount = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith("https://generativelanguage.googleapis.com/")) {
      return Response.json({
        candidates: [{
          content: { parts: [{ text: "A grounded factual statement." }] },
          groundingMetadata: {
            groundingChunks: sourceUrls.map((url, index) => ({ web: { uri: url, title: `Source ${index + 1}` } })),
            groundingSupports: [{
              segment: { text: "A grounded factual statement." },
              groundingChunkIndices: sourceUrls.map((_, index) => index),
            }],
          },
        }],
      });
    }
    assert.ok(sourceUrls.includes(url));
    sourceFetchCount += 1;
    return new Response("denied", { status: 403 });
  };

  try {
    const response = await POST(new Request("http://localhost/api/research/gemini", {
      method: "POST",
      headers: { "content-type": "application/json", "x-gemini-api-key": "x".repeat(24) },
      body: JSON.stringify({ prompt: "A sufficiently detailed research prompt", useSearch: true, maxOutputTokens: 1_100 }),
    }));
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.sourceExtractions.length, 9);
    assert.equal(payload.sourceExtractions[0].status, "inaccessible");
    assert.equal(payload.sourceExtractions[0].groundingExcerpt, "A grounded factual statement.");

    const auditResponse = await POST(new Request("http://localhost/api/research/gemini", {
      method: "POST",
      headers: { "content-type": "application/json", "x-gemini-api-key": "x".repeat(24) },
      body: JSON.stringify({ prompt: "Audit the stored provider registry", useSearch: true, extractSources: false, maxOutputTokens: 1_100 }),
    }));
    const auditPayload = await auditResponse.json();
    assert.equal(auditResponse.status, 200);
    assert.equal("sourceExtractions" in auditPayload, false);
    assert.equal(sourceFetchCount, 9);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
