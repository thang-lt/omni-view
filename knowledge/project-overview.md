# Project Overview

## 1. Mục tiêu

Đa Chiều Research Desk là prototype nghiên cứu sự kiện và luận điểm có tranh chấp. Hệ thống tìm nguồn theo hai chiến lược, đọc phần nội dung có thể truy cập, phân tích các quan điểm cạnh tranh, tạo cảnh báo nguồn có evidence và tổng hợp claim có điều kiện.

Ứng dụng không tuyên bố AI xác định sự thật hoặc tự động xác định khuynh hướng chính trị. Warning là tín hiệu cần kiểm tra; warning confidence không phải điểm uy tín của nguồn.

## 2. Trạng thái hiện tại

| Khả năng | Trạng thái | Giới hạn quan trọng |
|---|---|---|
| Research Desk responsive | Đã có | Một route chính, lịch sử cục bộ tối đa 5 phiên |
| Hai Source Scout | Đã có | Balanced Scout và Counter-evidence Scout search song song, tối đa 8 URL sau dedupe URL chính xác |
| Gemini same-origin gateway | Đã có | Validate body/prompt/schema/token, timeout và retry tối đa 3 lần cho 429/5xx; browser vẫn gửi BYOK cho từng request |
| Server source extraction | Đã có | Không có public arbitrary-fetch route; gateway chỉ extract tối đa 8 URL lấy từ Gemini grounding metadata |
| Source family service | Đã có | Heuristic cluster theo canonical URL, fingerprint trùng chính xác và upstream ID rõ ràng; chưa có fuzzy similarity/ownership graph |
| Structured source audit | Đã có | Warning quote tối thiểu 20 ký tự phải khớp excerpt; quote đã xác minh được hiển thị; status vẫn `machine-only` |
| Coverage gate | Đã có | Chỉ nhận 7 tag allowlist từ nguồn `read`/`partial`, tối đa 4 tag/nguồn; phân loại vẫn phụ thuộc model |
| Structured Claim Ledger | Đã có | Citation chỉ hợp lệ khi `evidenceQuote` khớp chính xác excerpt và có character locator |
| Citation audit | Một phần | Kiểm tra quote/source/locator ở mức exact substring; chưa chứng minh semantic entailment hoặc đầy đủ ngữ cảnh |
| DDD domain model | Đã có | Factory/invariant thuần cho source, evidence, claim, warning và coverage |
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
  pipeline-artifacts.ts            # parse structured audit/claim artifacts
  source-intelligence.ts           # family, coverage, citation services
domain/research/                    # entities, value contracts, invariants
infrastructure/
  gemini/request.ts                # gateway request validation
  source/extraction.ts             # bounded fetch/extract + URL safety
components/research-artifacts.tsx  # Coverage, Claim Ledger, Warning panels
db/schema.ts                       # D1 schema; runtime chưa ghi dữ liệu
drizzle/0000_demonic_terrax.sql    # migration đầu tiên
tests/                              # domain/application/infrastructure/SSR tests
```

## 4. Ranh giới hiện tại

`runLiveResearch` đã tách orchestration thành application use case với ports cho Gemini, extraction mapping, phase và log. `app/page.tsx` vẫn giữ adapter HTTP, state và local history. Chưa có durable repository, background job, cancellation toàn run hoặc partial-result recovery.
