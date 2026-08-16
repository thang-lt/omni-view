# Perspective Lens — Tài Liệu Đặc Tả & Kiến Trúc Kỹ Thuật Dự Án (Project Spec & Architecture)

> **Mục đích tài liệu:** Cung cấp bức tranh toàn cảnh chuẩn hóa về **Dự án Perspective Lens** dành cho AI và đội ngũ phát triển. Tài liệu giúp định hình rõ ràng Tầm nhìn sản phẩm, Đặc tả Kỹ thuật (Clean Architecture & DDD), Các bước đã hoàn thành và Lộ trình sắp tới.

---

## 1. ĐẶC TẢ SẢN PHẨM (PRODUCT SPECIFICATION)

### 1.1. Tầm nhìn & Mục tiêu (Product Vision)
* **Tên sản phẩm:** Perspective Lens (Lăng Kính Nghiên Cứu Đa Chiều)
* **Vấn đề cốt lõi:** Các công cụ tìm kiếm và mạng xã hội hiện tại dễ đẩy người dùng vào "Bẫy thông tin một chiều" (Filter Bubbles / Echo Chambers) bởi thuật toán SEO và định hướng truyền thông.
* **Sứ mệnh:** Đóng vai trò là "Lăng kính Khách quan", giúp người dùng nhìn thấy bức tranh toàn cảnh 2 mặt (**Ủng hộ vs Phản đối**) cùng **số liệu thực tế kiểm chứng** và **trích dẫn bài viết uy tín** thời gian thực trước khi đưa ra quyết định.

### 1.2. Nhóm Đối tượng Người dùng (Target Personas)
1. **Người ra Quyết định (Lãnh đạo, Nhà đầu tư, Người mua sắm):** Cần nhìn rõ cả Cơ hội lẫn Rủi ro tiềm ẩn + Số liệu thực tế trước khi ra quyết định tài chính/kinh doanh.
2. **Người làm việc với Tri thức (Nhà báo, Sinh viên, Researcher):** Cần tìm kiếm luận điểm phản biện trái chiều và trích dẫn nguồn uy tín để tham chiếu.
3. **Công chúng nói chung:** Cần hiểu bản chất sự kiện nóng một cách trung lập, không bị thao túng bởi truyền thông phiến diện.

### 1.3. Phạm vi Yêu cầu & Trải nghiệm Người dùng (UX & Scope)
* **Zero-Friction UX:** Không cần đăng ký/đăng nhập. Người dùng vào là sử dụng được ngay.
* **No Database Required (Stateless):** Không cần lưu hạ tầng CSDL backend. Lịch sử được lưu hoàn toàn phía Client (`sessionStorage`).
* **Trực tiếp với Google Gemini AI:** Tích hợp trực tiếp Google Gemini API thời gian thực để phân tích mọi chủ đề.
* **Bảo mật Key phía Client:** Người dùng nhập và lưu trữ Gemini API Key trực tiếp trên trình duyệt (`localStorage`) hoặc file `.env`.

---

## 2. TÀI LIỆU KỸ THUẬT (TECHNICAL ARCHITECTURE & DDD SPECS)

Dự án áp dụng chặt chẽ 3 nguyên tắc nền tảng: **Clean Architecture**, **Domain-Driven Design (DDD)** và **Test-Driven Development (TDD)**.

```
                  ┌─────────────────────────────────────────┐
                  │           PRESENTATION LAYER            │
                  │ (React Components, Custom Hooks, CSS)   │
                  └────────────────────┬────────────────────┘
                                       │
                  ┌────────────────────▼────────────────────┐
                  │            APPLICATION LAYER            │
                  │   (AnalyzeTopicUseCase, GetHistory...)  │
                  └────────────────────┬────────────────────┘
                                       │
                  ┌────────────────────▼────────────────────┐
                  │              DOMAIN LAYER               │
                  │ (Entities, Value Objects, Repositories) │
                  └────────────────────▲────────────────────┘
                                       │
                  ┌────────────────────┴────────────────────┐
                  │           INFRASTRUCTURE LAYER          │
                  │  (GeminiPerspectiveAnalyzer, Storage)   │
                  └─────────────────────────────────────────┘
```

### 2.1. Chi tiết Tầng Domain (`src/domain/`)
* **Value Objects:**
  * `Stance`: Định nghĩa hằng số quan điểm (`PRO` - Ủng hộ, `CON` - Phản đối, `NEUTRAL` - Trung lập).
  * `Evidence`: Chứa thông tin số liệu kiểm chứng (`metric`, `description`, `context`).
  * `Citation`: Chứa nguồn dẫn chứng (`url`, `title`, `sourceName`, `credibilityScore`).
* **Entities & Aggregates:**
  * `Argument`: Đại diện cho 1 luận điểm (`id`, `claim`, `reasoning`, `evidences[]`, `citations[]`).
  * `Perspective`: Đại diện cho góc nhìn 1 bên (`stance`, `title`, `summary`, `arguments[]`).
  * `Topic` (Aggregate Root): Đóng gói toàn bộ thông tin chủ đề (`id`, `title`, `query`, `neutralSummary`, `perspectives[]`, `createdAt`).
* **Repository & Service Interfaces (Ports):**
  * `ISessionRepository`: Cổng lưu trữ lịch sử phiên (`saveTopic`, `getTopics`, `clearHistory`).
  * `IPerspectiveAnalyzer`: Cổng phân tích chủ đề đa chiều (`analyzeTopic(query)`).

### 2.2. Chi tiết Tầng Application (`src/application/`)
* `AnalyzeTopicUseCase`: Tiếp nhận query từ UI, gọi `IPerspectiveAnalyzer` để phân tích, tự động lưu kết quả vào `ISessionRepository` và trả về `Topic`.
* `GetSessionHistoryUseCase`: Lấy danh sách chủ đề đã tra cứu trong phiên.
* `ClearSessionUseCase`: Xóa toàn bộ dữ liệu trong phiên.

### 2.3. Chi tiết Tầng Infrastructure (`src/infrastructure/`)
* `GeminiPerspectiveAnalyzer`: Adapters trực tiếp gọi REST API của Google Gemini (`gemini-2.5-flash` / `gemini-1.5-flash`) với cơ chế JSON Schema Output, tự động ép cấu hình trả về định dạng tiếng Việt 2 chiều chuẩn xác.
* `SessionStorageRepository`: Adapters quản lý lưu trữ danh sách `Topic` trên `sessionStorage` của trình duyệt.
* `ApiKeyRepository`: Adapters quản lý API Key từ `localStorage` hoặc `import.meta.env.VITE_GEMINI_API_KEY`.

### 2.4. Chi tiết Tầng Presentation (`src/presentation/`)
* `usePerspectiveLens`: Custom hook kết nối các Use Cases với giao diện React.
* `SearchHeader`: Thanh tìm kiếm + Các nút gợi ý chủ đề + Indicator trạng thái Gemini API Key.
* `SettingsModal`: Dialog modal giúp người dùng nhập/lưu/xóa Gemini API Key trực tiếp.
* `TopicOverview`: Thẻ hiển thị tóm tắt trung lập của bài nghiên cứu.
* `PerspectiveColumn`: 2 cột so sánh trực quan (Pros - Ủng hộ vs Cons - Phản đối).
* `EvidenceCard`: Badge làm nổi bật chỉ số/số liệu thực tế (+40% Năng suất, 300M Việc làm...).
* `CitationList`: Danh sách nguồn dẫn chứng uy tín có link truy cập trực tiếp.
* `SessionHistorySidebar`: Sidebar theo dõi lịch sử tìm kiếm trong phiên.

---

## 3. CÁC BƯỚC TIẾN HÀNH (STEPS & ROADMAP)

### 3.1. ĐÃ HOÀN THÀNH (DONE - Phases 1 to 4)

- [x] **Bước 1: Khởi tạo Hạ tầng Dự án**
  - Đã tạo dự án Vite + React + TypeScript + Vitest tại `c:\Users\ADMIN\Documents\omni-view`.
  - Cấu hình môi trường TDD Vitest (`vite.config.ts`, `src/test/setup.ts`).
- [x] **Bước 2: Xây dựng Tầng Domain (TDD)**
  - Đã viết Unit Tests cho Entities & Value Objects.
  - Đã hoàn thành các lớp `Stance`, `Citation`, `Evidence`, `Argument`, `Perspective`, `Topic`.
  - Đã định nghĩa Interfaces `ISessionRepository` và `IPerspectiveAnalyzer`.
- [x] **Bước 3: Xây dựng Tầng Application Use Cases (TDD)**
  - Đã viết Unit Tests cho các Use Cases.
  - Triển khai `AnalyzeTopicUseCase`, `GetSessionHistoryUseCase`, `ClearSessionUseCase`.
- [x] **Bước 4: Triển khai Infrastructure với Google Gemini AI (TDD)**
  - Đã xóa bỏ toàn bộ data mẫu giả lập.
  - Triển khai `GeminiPerspectiveAnalyzer` gọi trực tiếp Google Gemini API.
  - Triển khai `ApiKeyRepository` và `SessionStorageRepository`.
- [x] **Bước 5: Phát triển Giao diện UI & Glassmorphism Theme**
  - Xây dựng hệ thống CSS Token (`theme.css`) đáp ứng Dark mode hiện đại, glassmorphism.
  - Hoàn thiện tất cả React Components & Settings Modal nhập Key.
- [x] **Bước 6: Kiểm thử Tổng thể & Khai trương Local App**
  - Pass 100% (16/16) Unit Tests.
  - `npm run build` thành công 0 lỗi.
  - Dev Server đang chạy sẵn tại `http://127.0.0.1:5173/`.

---

### 3.2. SẮP LÀM (UPCOMING ROADMAP - Phase 5+)

- [ ] **Bước 7: Tích hợp Gemini Google Search Grounding (Live Web Grounding)**
  - Bật cấu hình `googleSearchRetrieval` trong API request tới Gemini để lấy dữ liệu thời gian thực theo giây từ Google Search.
- [ ] **Bước 8: Xuất Báo cáo Nghiên cứu (Export Report)**
  - Bổ sung nút "Tải Báo Cáo" hỗ trợ định dạng **PDF** và **Markdown** để người làm nghiên cứu/nhà báo dễ dàng lưu trữ.
- [ ] **Bước 9: Đo lường Chỉ số Đa dạng Nguồn tin (Diversity & Bias Score Meter)**
  - Bổ sung thanh đo lường tỉ lệ cân bằng giữa 2 luồng ý kiến và đánh giá độ tin cậy của các nguồn báo chí được trích dẫn.
- [ ] **Bước 10: Hỗ trợ Đa Ngôn ngữ (Multi-language Analysis)**
  - Tự động phát hiện và hỗ trợ phân tích báo cáo bằng Tiếng Anh, Tiếng Nhật, Tiếng Pháp... theo ngôn ngữ nhập của người dùng.
