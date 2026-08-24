# UI Design System

## 1. Design direction

Phong cách **Editorial Intelligence / Investigative Research Desk**: giống bàn làm việc của nhóm phân tích điều tra hơn dashboard SaaS.

Nguyên tắc:

- Nền giấy ấm, màu mực trầm.
- Serif cho headline và kết luận; sans-serif cho control và metadata.
- Viền mảnh, bo góc nhẹ, ít shadow.
- Mật độ thông tin cao nhưng hierarchy rõ.
- Màu luôn đi kèm text hoặc icon trạng thái.

## 2. Color tokens

| Token | Giá trị | Vai trò |
|---|---|---|
| `--paper` | `#F3F0E8` | Nền ứng dụng |
| `--card` | `#FBFAF6` | Surface |
| `--ink` | `#1D211F` | Chữ chính |
| `--muted` | `#68706C` | Metadata |
| `--line` | `#D8D4CA` | Border |
| `--red` | `#BD4A34` | CTA/active |
| `--red-dark` | `#963824` | Accent đậm |
| `--green` | `#176C57` | Verified/live |
| `--amber` | `#B37713` | Warning |
| `--blue` | `#405F70` | Context |

## 3. Layout

Desktop:

```text
Topbar 64px
Status banner 34px
┌──────────────┬──────────────────────────────┬──────────────────┐
│ Pipeline 248 │ Workspace fluid              │ Inspector 304    │
└──────────────┴──────────────────────────────┴──────────────────┘
```

- Dưới 1100px: Inspector chuyển xuống dưới.
- Dưới 760px: layout một cột, wave list cuộn ngang, table thành card.

## 4. Component inventory

- Topbar + brand.
- Gemini connection status.
- Live-only connection banner.
- Research composer.
- Seven-wave pipeline rail.
- Run ribbon + meter.
- Result tabs.
- Metric cards.
- Source list/filter.
- Claim ledger.
- Khối Provider Registry + Source Audit ngay dưới Analysis Roles: mỗi provider chứa verification citations và các source-warning card có quote provenance của nguồn thuộc provider đó.
- Agent append-only log.
- Evidence inspector.
- Gemini key modal.
- Live report and grounded source list.

## 5. Typography

- Georgia/serif: headline, section title, research finding và narrative text.
- System sans-serif: controls, metadata, labels và trạng thái.
- Monospace: ID và sequence number.
- Eyebrow: uppercase, 9px, bold, tracking rộng.

## 6. Interaction rules

- Hover thay đổi border/nền nhẹ, không animation trang trí.
- Active dùng inset border đỏ hoặc xanh.
- Running state có pulse nhỏ.
- Modal đóng bằng nút hoặc click backdrop.
- External source mở tab mới với `rel="noreferrer"`.
- `prefers-reduced-motion` giảm animation.

## 7. Content rules

Nên dùng:

- “Bằng chứng hiện có cho thấy…”
- “Chưa đủ dữ liệu để kết luận.”
- “Cảnh báo, không phải phán quyết về toàn bộ nguồn.”
- “Quote khớp grounding-support model-generated, không phải nguyên văn trang nguồn.”
- “Đủ nhóm theo phân loại máy; chưa thay thế đánh giá chuyên gia.”

Không dùng:

- “AI đã xác định sự thật.”
- “Chính xác 100%.”
- Confidence dưới dạng xác suất nếu chưa hiệu chuẩn.
- Perspective ID như một nhãn uy tín hoặc verdict factual.
