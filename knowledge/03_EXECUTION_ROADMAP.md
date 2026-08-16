# 03. CÁC BƯỚC TIẾN HÀNH & LỘ TRÌNH TRIỂN KHAI (EXECUTION LOG & ROADMAP)

> **Dự án:** Perspective Lens — Hệ thống Tìm kiếm & Nghiên cứu Thông tin Đa chiều  
> **Mục tiêu tài liệu:** Ghi nhận chính xác các bước đã làm, trạng thái kiểm thử hiện tại và lộ trình phát triển tiếp theo.

---

## 1. NHẬT KÝ CÁC BƯỚC ĐÃ HOÀN THÀNH (COMPLETED STEPS LOG)

### ✅ Bước 1: Khởi tạo Hạ tầng Dự án (Phase 1)
- [x] Tạo dự án Vite + React + TypeScript tại `c:\Users\ADMIN\Documents\omni-view`.
- [x] Cấu hình môi trường TDD Vitest (`vite.config.ts`, `src/test/setup.ts`).
- [x] Cài đặt các thư viện phụ trợ: `lucide-react`, `@testing-library/react`, `jsdom`.

### ✅ Bước 2: Xây dựng Tầng Domain với TDD (Phase 2)
- [x] Viết Unit Tests kiểm thử cho Domain Models ([`DomainModels.test.ts`](file:///c:/Users/ADMIN/Documents/omni-view/src/domain/models/__tests__/DomainModels.test.ts)).
- [x] Hoàn thiện các lớp `Stance`, `Citation`, `Evidence`, `Argument`, `Perspective`, `Topic`.
- [x] Định nghĩa Interfaces `ISessionRepository` và `IPerspectiveAnalyzer`.

### ✅ Bước 3: Xây dựng Application Use Cases với TDD (Phase 3)
- [x] Viết Unit Tests cho Use Cases ([`UseCases.test.ts`](file:///c:/Users/ADMIN/Documents/omni-view/src/application/use-cases/__tests__/UseCases.test.ts)).
- [x] Hoàn thiện `AnalyzeTopicUseCase`, `GetSessionHistoryUseCase`, `ClearSessionUseCase`.

### ✅ Bước 4: Chuyển đổi Infrastructure sang Google Gemini AI (Phase 4)
- [x] **Xóa bỏ toàn bộ data mẫu giả lập (Mock Data).**
- [x] Xây dựng Adapter `GeminiPerspectiveAnalyzer.ts` kết nối trực tiếp với Google Gemini API (`gemini-2.5-flash` / `gemini-1.5-flash`).
- [x] Viết Unit Tests kiểm thử cho `GeminiPerspectiveAnalyzer`.
- [x] Xây dựng `ApiKeyRepository.ts` quản lý Key tại `localStorage` và `.env`.
- [x] Triển khai `SessionStorageRepository.ts` quản lý lịch sử phiên trên `sessionStorage`.

### ✅ Bước 5: Phát triển Giao diện UI & Glassmorphism Theme (Phase 5)
- [x] Xây dựng `theme.css` đáp ứng chuẩn Dark mode sang trọng, responsive 2 cột.
- [x] Phát triển React Components: `SearchHeader`, `TopicOverview`, `PerspectiveColumn`, `EvidenceCard`, `CitationList`, `SessionHistorySidebar`.
- [x] Phát triển `SettingsModal` hỗ trợ người dùng lưu/nhập Gemini API Key dễ dàng.

### ✅ Bước 6: Kiểm thử & Khai trương Ứng dụng
- [x] **16/16 Unit Tests PASSED 100%** qua Vitest.
- [x] **`npm run build` thành công 100%** (0 lỗi, 0 cảnh báo).
- [x] Khởi chạy Local Dev Server tại **`http://127.0.0.1:5173/`**.

---

## 2. KẾT QUẢ KIỂM THỬ KỸ THUẬT HỆ THỐNG (CURRENT TEST MATRIX)

```bash
 RUN  v4.1.10 C:/Users/ADMIN/Documents/omni-view

 ✓ src/infrastructure/persistence/__tests__/SessionStorageRepository.test.ts (2 tests)
 ✓ src/domain/models/__tests__/DomainModels.test.ts (6 tests)
 ✓ src/application/use-cases/__tests__/UseCases.test.ts (4 tests)
 ✓ src/infrastructure/ai/__tests__/GeminiPerspectiveAnalyzer.test.ts (2 tests)
 ✓ src/infrastructure/ai/__tests__/MockPerspectiveAnalyzer.test.ts (2 tests)

 Test Files  5 passed (5)
      Tests  16 passed (16)
   Duration  2.42s
```

---

## 3. LỘ TRÌNH CÁC BƯỚC SẮP LÀM (UPCOMING ROADMAP - PHASE 5+)

- [ ] **Bước 7: Tích hợp Gemini Google Search Grounding (Live Web Grounding)**
  - Bật cấu hình `googleSearchRetrieval` trong API request tới Gemini để tự động kết nối nguồn thông tin tin tức tìm kiếm Google theo giây.
- [ ] **Bước 8: Xuất Báo cáo Nghiên cứu (Export Feature)**
  - Bổ sung nút "Xuất Báo Cáo" hỗ trợ tải file **PDF** và **Markdown** phục vụ cho nhà báo, nhà nghiên cứu và học sinh/sinh viên.
- [ ] **Bước 9: Đo lường Chỉ số Đa dạng Nguồn tin & Độ Thiên vị (Diversity & Bias Score Meter)**
  - Hiển thị thanh tỷ lệ phần trăm phân bổ cân bằng giữa 2 luồng quan điểm và xếp hạng độ tin cậy của các báo cáo/bài viết được trích dẫn.
- [ ] **Bước 10: Hỗ trợ Đa Ngôn ngữ (Multi-language Analysis)**
  - Cho phép người dùng chuyển đổi hoặc tự động nhận diện phân tích báo cáo bằng Tiếng Anh, Tiếng Nhật, Tiếng Pháp... theo nhu cầu.
