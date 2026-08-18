# Project Overview

## 1. Mục tiêu

Đa Chiều Research Desk là prototype web hỗ trợ nghiên cứu một chủ đề theo quy trình đa tác nhân:

1. Tìm nguồn đa dạng.
2. Phân nhóm nguồn và theo dõi provenance.
3. Phân tích quan điểm, luận điểm và giả định.
4. Tìm phản chứng, bias, framing chính trị và lỗi lập luận.
5. Tổng hợp kết luận có điều kiện, kèm nguồn grounding.

Ứng dụng không tuyên bố “AI xác định sự thật”. Kết quả là hỗ trợ nghiên cứu và phải được người dùng kiểm tra lại ở nguồn gốc.

## 2. Trạng thái hiện tại

| Khả năng | Trạng thái | Ghi chú |
|---|---|---|
| Giao diện Research Desk | Đã có | Một route, responsive, bố cục ba vùng |
| Live-only pipeline 7 wave | Đã có | Chỉ chạy khi có Gemini API key; không fallback dữ liệu mẫu |
| Gemini BYOK | Đã có | Key lưu trong `sessionStorage` |
| Google Search grounding | Đã có | Source Scout tìm tối đa 6 nguồn đa chiều; hai worker còn lại dùng chung source packet |
| Source bias audit | Đã có | Ghi tín hiệu, confidence và cách kiểm tra riêng cho từng URL; bias không đồng nghĩa sai |
| Evidence Judge | Đã có | Request Gemini thứ tư, không dùng search |
| Danh sách URL grounding | Đã có | Khử trùng lặp theo URL |
| Claim-level citation mapping | Chưa có | URL chưa gắn chính xác vào từng câu báo cáo |
| Source family/provenance graph thật | Chưa có | Mới nằm trong prompt và thiết kế mục tiêu |
| Persistence lịch sử nghiên cứu | Đã có | `localStorage` giữ tối đa 5 phiên hoàn tất; API key không nằm trong lịch sử |
| Server-side secret proxy | Chưa có | API call hiện chạy trực tiếp từ browser |
| D1/R2 | Chưa bật | `.openai/hosting.json` để `null` |
| Production deployment | Chưa có | Sites chưa được bật cho workspace tại lần thử gần nhất |

## 3. Công nghệ

- React 19 + TypeScript.
- Vinext trên Vite.
- Cloudflare Vite plugin và Worker-compatible output.
- Tailwind được import nhưng phần lớn giao diện dùng CSS thuần.
- Gemini REST `generateContent`.
- Model hiện tại: `gemini-3.5-flash-lite`, thinking `minimal`.
- Drizzle ORM đã cài nhưng schema dự án đang trống.

## 4. Cấu trúc source

```text
BI2/
├── app/
│   ├── page.tsx              # UI, state và Gemini orchestration
│   ├── globals.css           # Toàn bộ visual system và responsive
│   ├── layout.tsx            # Metadata và root HTML
│   └── chatgpt-auth.ts       # Helper auth có sẵn, hiện chưa dùng
├── worker/index.ts           # Cloudflare Worker entry
├── db/
│   ├── index.ts              # D1/Drizzle accessor
│   └── schema.ts             # Hiện chưa có table
├── tests/
│   └── rendered-html.test.mjs
├── public/
│   └── og.png                # Social preview
├── work/
│   └── MULTI_AGENT_RESEARCH_DESIGN.md
├── knowledge/                # Tài liệu dự án
├── .openai/hosting.json
├── vite.config.ts
├── package.json
└── README.md
```

## 5. Các điểm tập trung kỹ thuật

`app/page.tsx` hiện chứa nhiều trách nhiệm:

- Type definitions.
- Gemini API client.
- Prompt templates.
- Multi-agent orchestration.
- State persistence.
- UI rendering.

Đây là lựa chọn phù hợp cho prototype nhưng là điểm cần tách đầu tiên khi mở rộng.
