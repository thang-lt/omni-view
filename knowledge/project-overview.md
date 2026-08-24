# Project Overview

## 1. Mục tiêu

Đa Chiều Research Desk là prototype nghiên cứu sự kiện và luận điểm có tranh chấp. Hệ thống tìm nguồn chính thống và phản chứng theo hai chiến lược độc lập, giữ provenance của phần nội dung có thể đọc, phân tích góc nhìn cạnh tranh, kiểm tra đơn vị xuất bản, tạo cảnh báo nguồn có evidence và tổng hợp claim có điều kiện.

Ứng dụng không tuyên bố AI xác định sự thật. Provider Verification có thể tạo assessment máy về thiên hướng chính trị/biên tập khi có bằng chứng, nhưng assessment này không phải verdict factual hay điểm uy tín tuyệt đối. Warning là tín hiệu cần kiểm tra; warning confidence không phải độ tin cậy tổng thể của nguồn.

## 2. Trạng thái hiện tại

| Khả năng | Trạng thái | Giới hạn quan trọng |
|---|---|---|
| Research Desk responsive | Đã có | Một route chính, lịch sử cục bộ tối đa 5 phiên |
| Hai Source Scout | Đã có | Search song song; final selector dedupe và xen kẽ hai danh sách để chốt tối đa 8 URL phân tích |
| Gemini same-origin gateway | Đã có | Validate body/prompt/schema/token, timeout và retry tối đa 3 lần cho 429/5xx; browser vẫn gửi BYOK cho từng request |
| Server source extraction | Đã có | Không có public arbitrary-fetch route; gateway extract toàn bộ URL grounding duy nhất của từng Scout theo concurrency 4, không cắt ở 8; use case mới chọn tập cuối |
| Source family service | Đã có | Heuristic cluster theo canonical URL, fingerprint trùng chính xác và upstream ID rõ ràng; chưa có fuzzy similarity/ownership graph |
| Structured Perspective | Đã có | 1–4 perspective gồm thesis, source IDs, stakeholder, assumptions, omissions và strongest counterargument; ID là nhãn model tự đặt |
| Provider verification | Đã có | Search ownership/affiliation, orientation và reputation một lần/provider; citation được map theo URL mà Auditor khai báo |
| Structured source audit | Đã có | Warning quote ≥20 ký tự phải khớp evidence passage; locator/provenance được hiển thị; status vẫn `machine-only` |
| Structured Claim Ledger | Đã có | Citation có quan hệ support/contradiction/context, exact quote ≥20 ký tự, locator và provenance; parser kiểm tra invariant của verdict |
| Citation audit | Một phần | Kiểm tra quote/source/locator ở mức exact substring; chưa chứng minh semantic entailment hoặc đầy đủ ngữ cảnh |
| DDD domain model | Đã có | Factory/invariant thuần cho source, evidence, claim và warning |
| D1 schema + migration | Đã có thiết kế | Chưa nối persistence vào pipeline; `.openai/hosting.json` vẫn có `d1: null` |
| Live Gemini E2E | Chưa xác nhận | Không chạy được nếu không có API key hợp lệ và quota/search access |

## 3. Công nghệ và cấu trúc

- React 19, TypeScript, Vinext/Vite và Cloudflare-compatible output.
- Gemini REST model `gemini-3.5-flash-lite`, thinking `minimal`.
- Drizzle ORM + SQLite/D1 schema và migration đầu tiên.

```text
app/
  page.tsx                         # browser orchestration và UI
  api/research/gemini/route.ts     # Gemini gateway + grounded-URL extraction
application/research/
  run-live-research.ts             # use case và ports cho pipeline live
  pipeline-artifacts.ts            # evidence passages + parse Perspective/audit/claim artifacts
  source-intelligence.ts           # family và citation services
domain/research/                    # entities, value contracts, invariants
infrastructure/
  gemini/request.ts                # gateway request validation
  source/extraction.ts             # bounded fetch/extract + URL safety
components/research-artifacts.tsx  # Claim Ledger và Provider/source audit panels
db/schema.ts                       # D1 schema; runtime chưa ghi dữ liệu
drizzle/0000_demonic_terrax.sql    # migration đầu tiên
tests/                              # domain/application/infrastructure/SSR tests
```

## 4. Ranh giới hiện tại

`runLiveResearch` đã tách orchestration thành application use case với ports cho Gemini, extraction mapping, phase và log. `app/page.tsx` vẫn giữ adapter HTTP, state và local history. Report là lớp diễn giải từ Claim Ledger đã validate, không phải nguồn sự thật độc lập. Chưa có durable repository, background job, cancellation toàn run, partial-result recovery hoặc human review.
