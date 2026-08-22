import assert from "node:assert/strict";
import test from "node:test";

import {
  extractSource,
  parsePublicHttpUrl,
} from "../infrastructure/source/extraction.ts";

test("accepts public HTTP(S) URLs and blocks unsafe literal hosts", () => {
  assert.equal(parsePublicHttpUrl("https://example.com/report").hostname, "example.com");
  for (const url of [
    "file:///etc/passwd",
    "http://localhost/admin",
    "http://127.0.0.1/admin",
    "http://10.2.3.4/",
    "http://172.20.1.2/",
    "http://192.168.1.2/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[fd00::1]/",
  ]) {
    assert.throws(() => parsePublicHttpUrl(url));
  }
});

test("extracts a readable bounded excerpt from HTML", async () => {
  const fetchImpl = async (_input, init) => {
    const headers = new Headers(init?.headers);
    assert.match(headers.get("user-agent"), /DaChieuResearchDesk/);
    assert.match(headers.get("accept-language"), /vi/);
    return new Response(`<!doctype html><html><head><title>  Sample &amp; Report </title><style>.x{}</style></head><body><main><h1>Finding</h1><p>Useful <b>evidence</b> &amp; context.</p><script>steal()</script></main></body></html>`, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };

  const result = await extractSource("https://example.com/report", { fetchImpl });
  assert.equal(result.status, "read");
  assert.equal(result.title, "Sample & Report");
  assert.match(result.excerpt, /Finding Useful evidence & context\./);
  assert.doesNotMatch(result.excerpt, /steal|\.x/);
});

test("validates every redirect target and blocks private redirects", async () => {
  const fetchImpl = async () => new Response(null, {
    status: 302,
    headers: { location: "http://127.0.0.1/private" },
  });

  const result = await extractSource("https://example.com/start", { fetchImpl });
  assert.equal(result.status, "inaccessible");
  assert.match(result.error, /blocked|private/i);
});

test("stops after the configured redirect limit", async () => {
  let calls = 0;
  const fetchImpl = async (input) => {
    calls += 1;
    assert.equal(new URL(String(input)).hostname, "example.com");
    return new Response(null, { status: 302, headers: { location: `/hop-${calls}` } });
  };

  const result = await extractSource("https://example.com/start", { fetchImpl, maxRedirects: 2 });
  assert.equal(result.status, "inaccessible");
  assert.equal(calls, 3);
  assert.match(result.error, /redirect/i);
});

test("returns metadata-only for unsupported content types without reading the body", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    cancel() { cancelled = true; },
  });
  const fetchImpl = async () => new Response(body, {
    headers: { "content-type": "application/pdf", "content-length": "999999" },
  });

  const result = await extractSource("https://example.com/file.pdf", { fetchImpl });
  assert.equal(result.status, "metadata-only");
  assert.equal(result.contentType, "application/pdf");
  assert.equal(cancelled, true);
});

test("caps downloaded bytes and marks the result partial", async () => {
  const fetchImpl = async () => new Response("A".repeat(200), {
    headers: { "content-type": "text/plain" },
  });

  const result = await extractSource("https://example.com/large.txt", {
    fetchImpl,
    maxBytes: 64,
    maxExcerptChars: 200,
  });
  assert.equal(result.status, "partial");
  assert.equal(result.bytesRead, 64);
  assert.equal(result.excerpt.length, 64);
});

test("reports network and HTTP failures as inaccessible", async () => {
  const network = await extractSource("https://example.com", {
    fetchImpl: async () => { throw new Error("offline"); },
  });
  assert.equal(network.status, "inaccessible");
  assert.match(network.error, /offline/);

  const denied = await extractSource("https://example.com", {
    fetchImpl: async () => new Response("denied", { status: 403 }),
  });
  assert.equal(denied.status, "inaccessible");
  assert.match(denied.error, /403/);
});
