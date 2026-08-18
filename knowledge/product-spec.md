# Product Specification

## 1. Product statement

Cho phép người dùng nhập một sự kiện, chủ đề hoặc tuyên bố; hệ thống thu thập thông tin đa chiều, làm rõ các narrative cạnh tranh, kiểm tra claim và trình bày mức độ bất định có thể truy nguyên.

## 2. Người dùng mục tiêu

- Nhà phân tích và researcher.
- Nhà báo hoặc fact-checker.
- Nhóm policy, strategy và risk.
- Người dùng cần hiểu một tranh luận phức tạp trước khi ra quyết định.

## 3. Job to be done

> Khi gặp một chủ đề có nhiều thông tin xung đột, tôi muốn nhìn thấy nguồn gốc, luận điểm, phản chứng và bias để hiểu điều gì đã biết, điều gì còn tranh chấp và điều gì chưa thể kết luận.

## 4. User flow hiện tại

1. Mở ứng dụng.
2. Kết nối Gemini API key.
3. Nhập chủ đề tối thiểu 8 ký tự.
4. Bấm **Bắt đầu**.
5. Theo dõi pipeline và nhật ký.
6. Xem báo cáo, output từng worker và danh sách URL grounding.
7. Mở lại một trong năm phiên hoàn tất gần nhất từ **Lịch sử nghiên cứu**.
8. In báo cáo bằng chức năng browser.

## 5. Functional requirements

### FR-01 — Research input

- Nhận một topic từ 8–180 ký tự.
- Không thực thi HTML từ input.
- Lưu topic gần nhất trong `localStorage`.

### FR-02 — Live-only policy

- Không chạy nghiên cứu khi chưa có API key.
- Không tạo source, claim, audit hoặc kết luận mẫu.
- Khi chưa có dữ liệu thật, hiển thị empty state và yêu cầu kết nối Gemini.

### FR-03 — Gemini connection

- Nhận key bằng input `password`.
- Chỉ lưu trong `sessionStorage`.
- Cho phép hiện/ẩn và xóa key.
- Không đưa key vào log, URL, source hoặc báo cáo.

### FR-04 — Live multi-agent research

- Chạy ba worker theo hai wave:
  - Source Scout.
  - Perspective Analyst.
  - Red Team & Bias Auditor.
- Source Scout sử dụng Google Search grounding và giữ tối đa sáu nguồn.
- Khi dữ liệu cho phép, sáu nguồn phải bao phủ nguồn sơ cấp, báo chí độc lập, học thuật/phương pháp, bên ủng hộ, bên phản biện/chịu tác động và góc nhìn địa phương/chuyên gia.
- Không dùng bài đăng lại cùng provenance để lấp đủ số lượng.
- Perspective Analyst và Red Team dùng chung source packet, không search thêm.
- Evidence Judge tổng hợp output của ba worker.
- Không đếm số agent đồng ý như bằng chứng.

### FR-05 — Live results

- Hiển thị báo cáo tổng hợp.
- Cho phép mở output từng worker.
- Hiển thị danh sách URL từ grounding metadata.
- Khử trùng lặp URL.
- Báo lỗi API bằng thông điệp có thể hành động.
- Với từng grounding URL, hiển thị lưu ý bias tiềm ẩn gồm tín hiệu quan sát được, confidence và cách kiểm tra chéo.
- Khi chưa đủ căn cứ, ghi rõ chưa đủ dữ kiện thay vì ép gán nhãn bias.

### FR-06 — Trust communication

- Ghi rõ hệ thống chỉ sử dụng dữ liệu live từ phiên Gemini hiện tại.
- Nêu rõ confidence không phải xác suất đúng tuyệt đối.
- Nêu rõ bias không đồng nghĩa nguồn sai.
- Yêu cầu kiểm tra nguồn gốc trước quyết định quan trọng.

### FR-07 — Lịch sử cục bộ

- Tự động lưu topic, thời điểm hoàn tất, báo cáo, output agents, model, tối đa sáu URL grounding và 20 dòng nhật ký điều phối của mỗi phiên hoàn tất.
- Chỉ giữ năm phiên gần nhất trong `localStorage`; phiên cũ nhất bị loại khi phiên thứ sáu hoàn tất.
- Validate dữ liệu hydrate và chỉ chấp nhận citation URL dùng giao thức `http` hoặc `https`.
- Cho phép mở lại báo cáo đã lưu sau khi refresh.
- Khi mở một phiên đã lưu, khôi phục đúng nhật ký của phiên đó; phiên cũ chưa có log phải hiển thị thông báo tương thích.
- Không lưu Gemini API key trong record lịch sử.

## 6. Non-functional requirements

- Responsive từ 375px trở lên.
- Keyboard-accessible cho control chính.
- Hỗ trợ `prefers-reduced-motion`.
- Không render API key vào SSR HTML.
- Build được thành Cloudflare Worker-compatible ESM.
- Không để lỗi một nguồn biến thành kết luận giả.

## 7. Out of scope hiện tại

- User account và chia sẻ workspace.
- Lưu nhiều research run trên server.
- Upload hoặc phân tích tài liệu riêng.
- Claim-level citation chính xác.
- Background job, queue và retry bền vững.
- Billing, quota management hoặc API key vault.
- Human approval workflow.

## 8. Acceptance criteria cho phiên bản hiện tại

- SSR trả HTTP 200 và hiển thị tên sản phẩm, CTA và nút kết nối Gemini.
- Source không chứa API key thật.
- Không có publisher, source, claim hoặc kết luận mẫu trong SSR/source.
- Live mode gọi đúng model `gemini-3.5-flash-lite` với thinking `minimal`.
- Chỉ Source Scout bật `google_search`; Judge và hai worker phân tích không bật search.
- Grounding URLs được hiển thị bằng link ngoài an toàn.
- Tối đa năm phiên hoàn tất được khôi phục từ `localStorage`; dữ liệu hỏng không làm ứng dụng crash.
- Build và rendered HTML test đều pass.
