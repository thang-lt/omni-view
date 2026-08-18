# Testing and Operations

## 1. Commands

Yêu cầu Node.js `>=22.13.0`.

```bash
npm run dev
npm run build
node --test tests/rendered-html.test.mjs
npm run lint
```

## 2. Test hiện tại

### Trạng thái kiểm tra gần nhất

Ngày 2026-08-18, `npm test` dừng ở bước build vì shell đang dùng Node.js
`v20.20.2`, thấp hơn mức `>=22.13.0` đã khai báo trong `package.json`.
Lỗi phát sinh khi Vinext import `glob` từ `node:fs/promises`. Đây là lỗi môi
trường chạy, chưa phải một test assertion thất bại. Chạy lại bằng Node.js phù
hợp trước khi đánh giá build/test của ứng dụng.

### Phạm vi test hiện có

`tests/rendered-html.test.mjs`:

- Import Worker build.
- Request route `/`.
- Kiểm tra HTTP 200.
- Kiểm tra title, live-only policy, CTA, pipeline và Gemini connection.
- Kiểm tra SSR có nhãn Lịch sử nghiên cứu.
- Kiểm tra không còn starter preview.
- Kiểm tra không có chuỗi trông giống Gemini key trong SSR HTML.
- Kiểm tra formatter cứu được `analysisMarkdown` từ JSON Bias Auditor bị cắt và gỡ code fence Markdown.

## 3. Khoảng trống kiểm thử

- Chưa có unit test cho `callGemini`.
- Chưa mock response grounding.
- Chưa test orchestration fan-out/fan-in.
- Chưa có unit/browser test cho hydrate, truncate và quota của session/local storage.
- Chưa test API error taxonomy.
- Chưa có browser interaction test.
- Chưa có accessibility automation.
- Chưa có visual regression.

## 4. Test plan mục tiêu

### Unit

- Citation extraction và URL dedupe.
- Topic validation.
- Không có dữ liệu mẫu trong SSR/source.
- Error normalization.
- Parse lịch sử hỏng, URL không an toàn và giới hạn năm phiên.
- Lưu/khôi phục tối đa 20 log theo đúng research run; record cũ không có `logs` vẫn hydrate được.
- Source-family grouping khi triển khai.

### Integration

- Source Scout trả tối đa sáu nguồn đa chiều; hai worker phân tích không search thêm; Judge chạy một lần.
- Source Bias Auditor chỉ trả note theo `sourceIndex` thuộc grounding packet; JSON hỏng dùng fallback “chưa đủ dữ kiện”.
- JSON bị cắt sau `analysisMarkdown` không được hiển thị nguyên khối trên UI.
- Một worker lỗi → partial result/retry theo policy mới.
- 429 → backoff.
- Empty grounding → report có warning.
- Wrong model → actionable error.

### E2E

- Kết nối/xóa key.
- Live run với mocked Gemini.
- Grounding source navigation.
- Mobile navigation.
- Print report.

## 5. Release checklist

- [ ] Không có secret trong source, dist hoặc test snapshot.
- [ ] `GEMINI_MODEL` còn khả dụng.
- [ ] Build pass.
- [ ] Render test pass.
- [ ] Live-only banner đúng trạng thái kết nối.
- [ ] Grounding link mở đúng và an toàn.
- [ ] Error state không làm mất key ngoài ý muốn.
- [ ] Prompt version được ghi lại nếu prompt thay đổi lớn.
- [ ] `git diff --check` sạch.

## 6. Hosting

`.openai/hosting.json` hiện không có `project_id`, D1 hoặc R2. Lần thử tạo Sites project gần nhất trả về workspace chưa bật Sites. Điều này không ảnh hưởng local development nhưng chặn production URL qua Sites.
