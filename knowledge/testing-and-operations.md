# Testing and Operations

## 1. Runtime requirement và commands

Yêu cầu Node.js `>=22.13.0`. Shell hệ thống có thể mặc định vào Node 20; trên máy hiện tại Node 22 nằm tại `/opt/homebrew/bin/node`.

```bash
npm run build
npm run lint
/opt/homebrew/bin/node --test tests/*.test.mjs
npm test
```

`npm test` tự chạy build rồi Node test; cần bảo đảm `node` trong `PATH` là bản đáp ứng engines.

## 2. Test suite hiện có

| File | Phạm vi |
|---|---|
| `domain-research.test.mjs` | Factories, invariants, immutability và coverage domain |
| `source-intelligence.test.mjs` | Canonical URL, exact family clustering, coverage theo family và citation completeness |
| `source-extraction.test.mjs` | URL safety, redirect, bounded read, HTML cleanup và failure status |
| `research-pipeline.test.mjs` | Evidence packet, structured source audit, warning downgrade và Judge citation gaps |
| `run-live-research.test.mjs` | Use case qua ports: hai Scout, extraction mapping, audit, coverage và Judge |
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
- [ ] Xác nhận chỉ hai Scout có search; Perspective, các lô Source Auditor và Judge đều không search; gateway chỉ extract URL từ grounding metadata.
- [ ] Xác nhận nguồn không đọc được hiện đúng read status.
- [ ] Xác nhận warning quote dưới 20 ký tự/không khớp bị downgrade, quote hợp lệ được hiển thị và status là `machine-only`.
- [ ] Xác nhận coverage chỉ tính tag allowlist từ nguồn readable và citation quote không khớp bị loại.
- [ ] `git diff --check` sạch.

## 5. Observability hiện tại

UI giữ tối đa 20 dòng orchestration log trong mỗi local history record. Chưa có server log model riêng, trace ID, token/cost metrics, durable audit log hoặc alerting. `agent_logs` mới là D1 schema, chưa được ghi ở runtime.
