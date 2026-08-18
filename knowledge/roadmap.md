# Roadmap

## P0 — Độ tin cậy của prototype

- Tách Gemini client, prompts và orchestrator khỏi `page.tsx`.
- Thêm `AbortController` cho live run.
- Dùng `Promise.allSettled` và partial-result policy.
- Retry có backoff cho 429/5xx.
- Gắn prompt version và model vào run metadata.
- Thêm mock integration tests cho Gemini.

## P1 — Structured research artifacts

- Yêu cầu worker trả structured JSON.
- Tạo Source Registry thật.
- Tạo Claim Ledger thật.
- Lưu evidence locator và grounding supports.
- Map citation vào từng claim/câu báo cáo.
- Dựng evidence-family/provenance graph.
- Tính coverage gaps từ dữ liệu thay vì từ prose.

## P2 — Persistence và collaboration

- Thiết kế D1 schema.
- Lưu research run, source, claim, audit và log.
- Lịch sử run và so sánh phiên bản.
- Export JSON/Markdown/PDF.
- Share/read-only link.
- Human review và override record.

## P3 — Production security

- Chuyển Gemini call sang server-side gateway.
- Secret vault hoặc per-user encrypted credentials.
- Rate limit, quota và abuse control.
- Audit log không chứa secret.
- Content-size limit và prompt-injection isolation.
- CSP và security headers.

## P4 — Research quality

- Language/geography-aware query planner.
- Dedicated primary-source verification wave.
- Local-source and minority-voice coverage gate.
- Political framing multi-axis rubric.
- Calibration dataset cho confidence.
- Citation completeness auditor độc lập.
- Scheduled re-check cho claim thay đổi theo thời gian.

## Definition of production-ready

- Mọi claim trọng yếu truy về evidence locator.
- Các URL cùng upstream origin không bị đếm là độc lập.
- Một worker lỗi không làm mất toàn bộ run.
- Không có API key ở browser storage mặc định.
- Có durable state, observability và cost controls.
- Có regression tests cho prompt/schema/model migration.
- Báo cáo giữ uncertainty, dissent và source limitations.

