import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the research desk", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy") || "", /connect-src 'self'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const html = await response.text();
  assert.match(html, /Đa Chiều — Multi-Agent Research Desk/);
  assert.match(html, /Live only/);
  assert.match(html, /Bắt đầu/);
  assert.match(html, /Đội nghiên cứu/);
  assert.match(html, /Lịch sử nghiên cứu/);
  assert.match(html, /Tối đa 8 URL · gom cụm sơ bộ/);
  assert.match(html, /Warning có evidence/);
  assert.match(html, /Kết nối Gemini/);
  assert.match(html, /Không dữ liệu mẫu/);
  assert.doesNotMatch(html, /Demo mô phỏng|nguồn demo|C-0[1-9]|10 nguồn/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
  assert.doesNotMatch(html, /AIza[A-Za-z0-9_-]{20,}/);
});
