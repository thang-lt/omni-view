# Product Specification

## 1. Product statement

Cho phép người dùng nhập một sự kiện hoặc luận điểm; hệ thống tìm nguồn và phản chứng, đọc excerpt có giới hạn, trình bày coverage, claim, warning nguồn và mức bất định có thể kiểm tra lại.

## 2. Job to be done

> Khi thông tin xung đột và các bên có thể có lợi ích hoặc định kiến, tôi muốn biết claim nào dựa vào nguồn nào, góc nhìn nào còn thiếu và warning nào chỉ do máy phát hiện.

## 3. User flow hiện tại

1. Kết nối Gemini BYOK.
2. Nhập topic từ 8–180 ký tự và bắt đầu phiên live.
3. Hai Scout chạy Google Search bằng hai chiến lược độc lập về truy vấn.
4. Với từng Scout response, Gemini gateway chỉ đọc tối đa 8 URL do chính grounding metadata trả về; use case gộp citation và extraction theo URL.
5. Perspective Analyst đọc toàn bộ evidence packet; Source Warning Auditor đọc theo lô tối đa 4 nguồn để tránh JSON coverage bị cắt, sau đó validator hợp nhất kết quả.
6. Evidence Judge trả báo cáo và Claim Ledger có cấu trúc.
7. UI hiển thị Coverage Matrix, report, claims, source families, read status và warning.
8. Phiên hoàn tất được lưu cục bộ; có thể mở lại một trong 5 phiên gần nhất.

## 4. Functional requirements đã triển khai

### FR-01 — Live-only và BYOK

- Không tạo dữ liệu mẫu hoặc báo cáo fallback.
- Key nằm trong `sessionStorage`, không nằm trong history.
- Browser gửi key qua header tới same-origin gateway; gateway forward tới Gemini và không persistence key.

### FR-02 — Multi-query source discovery

- Balanced Source Scout ưu tiên nguồn sơ cấp, dữ liệu và phương pháp.
- Counter-evidence Scout chủ động tìm phản chứng, tổ chức bị phê phán, nhóm chịu tác động và chuyên gia không cùng lợi ích.
- Mỗi Scout không biết output của Scout kia tại thời điểm search.
- Gộp và cắt tối đa 8 URL grounding.

### FR-03 — Grounding-scoped server extraction

- Không còn public `/api/sources/extract`; client không thể gửi một URL tùy ý tới một proxy đọc nguồn.
- Gateway tự lấy URL từ `groundingMetadata` của Gemini search response rồi mới gọi extractor.
- Extractor chỉ chấp nhận URL HTTP(S) công khai theo validation hiện có.
- Manual redirect, kiểm tra lại mỗi redirect, tối đa 3 redirect mặc định.
- Mỗi grounded source có timeout 12 giây, tối đa 512 KB; gateway yêu cầu tối đa 3.000 ký tự excerpt.
- Script/style/template/SVG bị loại khỏi HTML text.
- Content không hỗ trợ như PDF được đánh dấu `metadata-only`; lỗi là `inaccessible`.

### FR-04 — Structured research artifacts

- Source audit gồm source type, stance, stakeholder groups, coverage tags và warnings.
- Evidence quote của warning phải dài tối thiểu 20 ký tự và khớp exact substring không phân biệt hoa thường; nếu không thì severity bị hạ xuống `info`, confidence `low`. Quote đã xác minh được hiển thị trong Warning Panel.
- Claim citation chỉ được tạo từ `evidenceQuote` khớp exact substring trong source excerpt; locator gồm locator nguồn và character offset.
- Coverage gate kiểm tra 7 nhóm allowlist: primary, claimant, counterparty, affected, independent expert, local và counterevidence. Nguồn `metadata-only`/`inaccessible` không được đóng góp coverage; mỗi nguồn tối đa 4 tag.
- Evidence packet được JSON encode bên trong vùng dữ liệu không đáng tin để source text không phá cấu trúc packet bằng delimiter giả.

### FR-05 — Trust communication

- UI ghi rõ warning confidence không phải source reliability.
- Warning hiện tại luôn là `machine-only`; chưa có human review workflow.
- Quan điểm chính trị khác không tự động đồng nghĩa sai, thù ghét hoặc disinformation.
- Read status và coverage gap được hiển thị.

### FR-06 — Local history

- Lưu tối đa 5 phiên tại `research-desk:runs:v2`, tối đa 20 log mỗi phiên.
- Validate URL HTTP(S) và shape cơ bản khi hydrate.
- D1 chưa được dùng cho history hoặc research run.

## 5. Out of scope/chưa hoàn tất

- Locator ngữ nghĩa theo paragraph/page/timestamp và snapshot/hash bền vững; character offset hiện chỉ nằm trong excerpt.
- Kiểm tra citation có thực sự entail claim và quote có đủ ngữ cảnh.
- Fuzzy copy detection, wire-service discovery, ownership/funding lookup tự động.
- Cancel toàn run, streaming và partial-run recovery. Gateway đã retry 429/5xx nhưng application use case vẫn fail nếu một call song song thất bại.
- User account, sharing, server history và human review.
- Phân tích PDF/media và DNS-resolution SSRF defense.

## 6. Acceptance criteria hiện tại

- Hai Scout là hai request có search; Analyst, Auditor và Judge không search.
- Không có grounding URL thì run dừng.
- Mỗi nguồn có read status và audit có thể là incomplete.
- Warning không có quote khớp excerpt phải bị downgrade.
- Claim có quote không khớp excerpt bị coi là thiếu evidence và phải được Citation Auditor công khai.
- Coverage thiếu nhóm không được hiển thị như coverage hoàn chỉnh.
- SSR không chứa API key hoặc dữ liệu nghiên cứu mẫu.
- Unit/integration/SSR tests pass trên Node đáp ứng `>=22.13.0`.
- Live Gemini E2E chỉ được coi là xác nhận khi chạy với key/quota thật; hiện chưa có xác nhận đó.
