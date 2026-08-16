# 01. ĐẶC TẢ SẢN PHẨM (PRODUCT SPECIFICATION)

> **Dự án:** Perspective Lens — Hệ thống Tìm kiếm & Nghiên cứu Thông tin Đa chiều  
> **Mục tiêu tài liệu:** Định hình tầm nhìn sản phẩm, đối tượng người dùng, bài toán kinh doanh và phạm vi tính năng cốt lõi.

---

## 1. TẦM NHÌN SẢN PHẨM & BÀI TOÁN KINH DOANH (PRODUCT VISION)

### 1.1. Vấn đề Cốt lõi (The Problem)
Các công cụ tìm kiếm truyền thống (như Google) và mạng xã hội hiện tại đang "nhốt" người dùng vào **Bẫy thông tin một chiều (Filter Bubbles / Echo Chambers)**:
* Tìm kiếm một chủ đề tranh cãi (như AI làm mất việc làm, chính sách kinh tế, đầu tư crypto, làm việc từ xa), người dùng chỉ nhận được các bài viết làm SEO tốt nhất hoặc câu trả lời áp đặt một chiều.
* Thiếu các thông tin phản biện, bằng chứng đối lập và số liệu kiểm chứng từ các nghiên cứu uy tín.

### 1.2. Giải pháp & Sứ mệnh (Perspective Lens Solution)
Perspective Lens đóng vai trò là **"Lăng kính Khách quan" (Objective Multi-Perspective Lens)**:
* Giúp người dùng nhìn thấy toàn bộ bức tranh 2 mặt (**Ủng hộ vs Phản đối**) cùng các **số liệu thực tế kiểm chứng** và **bài viết trích dẫn uy tín** trước khi đưa ra quyết định.
* Tự động tổng hợp dữ liệu nghiên cứu khách quan thời gian thực từ Google Gemini AI.

---

## 2. ĐỐI TƯỢNG NGƯỜI DÙNG CỐT LÕI (TARGET PERSONAS)

| Nhóm Người dùng | Nhu cầu Cốt lõi | Giá trị Perspective Lens Mang lại |
| :--- | :--- | :--- |
| **1. Người ra Quyết định** *(Lãnh đạo, Nhà đầu tư, Người mua)* | Cần nhìn rõ cả **Cơ hội lẫn Rủi ro tiềm ẩn** trước khi xuống tiền hoặc ra quyết định kinh doanh. | - Dashboard hiển thị 2 cột so sánh trực quan.<br>- Highlight các chỉ số/số liệu thực tế (Metrics Badges). |
| **2. Người làm việc với Tri thức** *(Nhà báo, Blogger, Researcher, Sinh viên)* | Cần tìm kiếm các **luận điểm phản biện trái chiều** và **trích dẫn nguồn uy tín** để làm nghiên cứu/viết bài. | - Trích dẫn link bài viết gốc từ các tổ chức uy tín (WEF, MIT, Harvard, Nature, Goldman Sachs...). |
| **3. Công chúng nói chung** | Muốn hiểu bản chất thực sự của sự kiện nóng mà không bị thao túng bởi truyền thông phiến diện. | - Thẻ tóm tắt trung lập (Neutral Summary) không thiên vị.<br>- Trải nghiệm mượt mà, dễ hiểu. |

---

## 3. PHẠM VI YÊU CẦU & RÀNG BUỘC (SCOPE & CONSTRAINTS)

### 3.1. Phạm vi Tính năng (Functional Requirements)
1. **Thanh tìm kiếm & Gợi ý Chủ đề (Search & Topic Pills):** Cho phép nhập bất kỳ câu hỏi tranh cãi nào hoặc chọn nhanh các chủ đề nóng có sẵn.
2. **Thẻ Tóm tắt Trung lập (Neutral Overview Card):** Cung cấp bức tranh toàn cảnh 2-3 câu ngắn gọn.
3. **Màn hình Phân tích 2 Cột Đối lập (Split-Screen Pro vs Con View):**
   * **Cột Ủng hộ (Pros):** Luận điểm chính + Lập luận + Badge số liệu thực tế + Nguồn trích dẫn.
   * **Cột Phản đối (Cons):** Luận điểm phản biện + Rủi ro + Badge số liệu thực tế + Nguồn trích dẫn.
4. **Quản lý Phiên làm việc (Session History):** Tự động theo dõi các chủ đề vừa nghiên cứu trong phiên truy cập hiện tại.
5. **Cấu hình Gemini API Key:** Modal giao diện cho phép nhập, lưu hoặc xóa Google Gemini API Key phía Client.

### 3.2. Ràng buộc Yêu cầu (Non-Functional Requirements)
* **Zero-Friction UX:** Không cần tạo tài khoản hay Đăng nhập / Đăng ký.
* **No Backend Database:** Không lưu trữ CSDL phía server, dữ liệu phiên nằm hoàn toàn trên `sessionStorage` của trình duyệt.
* **Client-side API Key Security:** Key lưu trữ an toàn trong `localStorage` hoặc đọc từ biến môi trường `.env`.
* **Giao diện Modern Glassmorphism:** Thiết kế chuẩn Dark mode sang trọng, hiệu ứng chuyển cảnh mượt mà.
