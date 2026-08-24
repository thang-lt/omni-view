# Testing and Operations

## Gemini debug logs trong development

Khi chạy `npm run dev`, mỗi Gemini operation in log theo ba stage `REQUEST`, `RESPONSE`, `ERROR`. API key không được đưa vào object log.

- Browser DevTools → Console → filter `[Gemini]` để xem prompt, config, raw response và lỗi theo agent.
- Terminal chạy dev server → filter `[Gemini Gateway]` để xem request ID, operation, prompt gửi upstream, HTTP status và raw payload Gemini.
- Browser DevTools → Network → chọn `POST /api/research/gemini` → Payload/Response để đối chiếu dữ liệu HTTP thực tế.

Các log chứa topic, source excerpt và model output nên chỉ bật trong development; production build không in các debug log này.

## 1. Runtime requirement và commands

Yêu cầu Node.js `>=22.13.0`. Shell hệ thống có thể mặc định vào Node 20; trên máy phát triển hiện tại có thể ưu tiên Homebrew Node 22 bằng `PATH=/opt/homebrew/opt/node@22/bin:$PATH`.

```bash
npm run build
npm run lint
npm test
```

Nếu `node --version` vẫn là Node 20:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm test
```

`npm test` tự chạy build rồi Node test; cần bảo đảm `node` trong `PATH` là bản đáp ứng engines.

## 2. Test suite hiện có

| File | Phạm vi |
|---|---|
| `domain-research.test.mjs` | Factories, invariants và immutability của domain |
| `source-intelligence.test.mjs` | Canonical URL, exact family clustering và citation completeness |
| `source-extraction.test.mjs` | URL safety, redirect, bounded read, HTML cleanup và failure status |
| `research-pipeline.test.mjs` | Evidence passages, structured Perspective/audit, provider citation mapping, warning downgrade và Judge verdict invariants |
| `run-live-research.test.mjs` | Use case qua ports: balanced selector, extraction mapping, provider verification batching, audit và Judge |
| `gemini-gateway.test.mjs` | Prompt/schema bounds, token bounds và transient retry policy |
| `research-format.test.mjs` | JSON/Markdown recovery |
| `rendered-html.test.mjs` | Worker SSR smoke test và không lộ key/dữ liệu mẫu |

Các test application/infrastructure dùng mock/fake response, không cần network.

## 3. Những gì test chưa chứng minh

- Không có live Gemini E2E vì test environment không được cấp API key/quota.
- Không xác nhận model hiện còn khả dụng hoặc Google Search grounding trả đúng schema ngoài thực tế.
- Không có browser interaction test cho full pipeline, key modal, history hoặc responsive behavior.
- Không có test D1 repository/persistence vì pipeline chưa nối D1.
- Không có migration apply test trên D1 thật.
- Exact quote/character locator có test, nhưng không có semantic citation entailment, bias calibration, false-positive hoặc prompt-injection benchmark.
- Không có DNS rebinding/hostname resolution SSRF test.

## 4. Release checklist

- [ ] Node đáp ứng engines.
- [ ] Build, lint và toàn bộ test pass.
- [ ] Không có secret trong source, dist, log hoặc snapshots.
- [ ] `.openai/hosting.json` binding phản ánh môi trường thật; hiện `d1` và `r2` là `null`.
- [ ] Nếu bật D1: apply migration và test repository trước khi tuyên bố persistence hoạt động.
- [ ] Chạy một smoke E2E với Gemini test key giới hạn quota; không commit key/output nhạy cảm.
- [ ] Xác nhận hai Scout search evidence; chỉ Provider Verification search Provider Registry; Perspective, structured Auditor và Judge không search; gateway chỉ extract URL từ grounding metadata của từng Scout response.
- [ ] Xác nhận nguồn không đọc được hiện đúng read status.
- [ ] Xác nhận warning quote dưới 20 ký tự/không khớp bị downgrade, quote hợp lệ được hiển thị và status là `machine-only`.
- [ ] Xác nhận claim quote không khớp bị loại và verdict thiếu relation bắt buộc bị hạ về `unresolved/low`.
- [ ] `git diff --check` sạch.

## 5. Observability hiện tại

UI giữ tối đa 20 dòng orchestration log trong mỗi local history record. Development có console log theo operation và request ID ngắn ở gateway, nhưng chưa có token/cost metrics, durable audit log, production tracing hoặc alerting. `agent_logs` mới là D1 schema, chưa được ghi ở runtime.
