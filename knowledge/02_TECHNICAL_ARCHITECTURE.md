# 02. TÀI LIỆU KIẾN TRÚC KỸ THUẬT (TECHNICAL ARCHITECTURE & DDD SPEC)

> **Dự án:** Perspective Lens — Hệ thống Tìm kiếm & Nghiên cứu Thông tin Đa chiều  
> **Mục tiêu tài liệu:** Đặc tả chi tiết kiến trúc phần mềm, nguyên lý Clean Architecture, Domain-Driven Design (DDD) và luồng dữ liệu API.

---

## 1. TỔNG QUAN KIẾN TRÚC (CLEAN ARCHITECTURE 4 TẦNG)

Dự án tuân thủ nghiêm ngặt mô hình Clean Architecture để đảm bảo tính độc lập hoàn toàn giữa nghiệp vụ lõi (Domain), logic ứng dụng (Application), hạ tầng (Infrastructure) và giao diện (Presentation).

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ 1. PRESENTATION LAYER (React Components, Custom Hooks, Theme CSS)      │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 2. APPLICATION LAYER (AnalyzeTopicUseCase, GetSessionHistoryUseCase...)│
 ├────────────────────────────────────────────────────────────────────────┤
 │ 3. DOMAIN LAYER (Topic, Perspective, Argument, Evidence, Citation)     │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 4. INFRASTRUCTURE LAYER (GeminiPerspectiveAnalyzer, SessionStorage)    │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ĐẶC TẢ TẦNG DOMAIN (`src/domain/`) - PURE TYPESCRIPT

Tầng Domain độc lập 100% với React, Vite hay bất cứ thư viện bên ngoài nào.

### 2.1. Value Objects
* **`Stance`** (`src/domain/models/Stance.ts`):
  * Enum/Const Object định nghĩa các vị thế: `PRO` (Ủng hộ), `CON` (Phản đối), `NEUTRAL` (Trung lập).
* **`Evidence`** (`src/domain/models/Evidence.ts`):
  * Thuộc tính: `metric: string` (chỉ số số liệu), `description: string` (mô tả), `context?: string`.
* **`Citation`** (`src/domain/models/Citation.ts`):
  * Thuộc tính: `url: string`, `title: string`, `sourceName: string`, `credibilityScore: number`.

### 2.2. Entities & Aggregate Root
* **`Argument`** (`src/domain/models/Argument.ts`):
  * Thuộc tính: `id: string`, `claim: string`, `reasoning: string`, `evidences: Evidence[]`, `citations: Citation[]`.
* **`Perspective`** (`src/domain/models/Perspective.ts`):
  * Thuộc tính: `stance: Stance`, `title: string`, `summary: string`, `arguments: Argument[]`.
* **`Topic`** (Aggregate Root - `src/domain/models/Topic.ts`):
  * Thuộc tính: `id: string`, `title: string`, `query: string`, `neutralSummary: string`, `perspectives: Perspective[]`, `createdAt: Date`.
  * Phương thức: `getPerspective(stance: Stance): Perspective | undefined`.

### 2.3. Repository & Service Interfaces (Ports)
* **`ISessionRepository`** (`src/domain/repositories/ISessionRepository.ts`):
  * `saveTopic(topic: Topic): Promise<void>`
  * `getTopics(): Promise<Topic[]>`
  * `getTopicById(id: string): Promise<Topic | null>`
  * `clearHistory(): Promise<void>`
* **`IPerspectiveAnalyzer`** (`src/domain/repositories/IPerspectiveAnalyzer.ts`):
  * `analyzeTopic(query: string): Promise<Topic>`

---

## 3. ĐẶC TẢ TẦNG APPLICATION (`src/application/`)

Chứa các Use Cases đại diện cho các hành vi nghiệp vụ của hệ thống:
1. **`AnalyzeTopicUseCase`** (`src/application/use-cases/AnalyzeTopicUseCase.ts`):
   * Tiếp nhận query, gọi `IPerspectiveAnalyzer`, tự động lưu kết quả qua `ISessionRepository`.
2. **`GetSessionHistoryUseCase`** (`src/application/use-cases/GetSessionHistoryUseCase.ts`):
   * Trích xuất danh sách lịch sử chủ đề từ `ISessionRepository`.
3. **`ClearSessionUseCase`** (`src/application/use-cases/ClearSessionUseCase.ts`):
   * Thực thi xóa dữ liệu lịch sử trong `ISessionRepository`.

---

## 4. ĐẶC TẢ TẦNG INFRASTRUCTURE (`src/infrastructure/`)

### 4.1. Google Gemini AI Adapter (`GeminiPerspectiveAnalyzer.ts`)
* Implement interface `IPerspectiveAnalyzer`.
* Gọi trực tiếp Google Gemini REST API Endpoint (`gemini-2.5-flash` / `gemini-1.5-flash`).
* Đăng ký cấu hình `generationConfig: { responseMimeType: "application/json" }` với System Prompt chuyên biệt để ép kiểu dữ liệu JSON đầu ra.

### 4.2. Quản lý Bộ nhớ & API Key Adapters
* **`SessionStorageRepository.ts`**: Triển khai `ISessionRepository` sử dụng `window.sessionStorage` của trình duyệt.
* **`ApiKeyRepository.ts`**: Quản lý API Key tại `window.localStorage` (key: `perspective_lens_gemini_api_key`) hoặc biến môi trường `import.meta.env.VITE_GEMINI_API_KEY`.

---

## 5. ĐẶC TẢ TẦNG PRESENTATION (`src/presentation/`)

* **`usePerspectiveLens.ts`**: Hook khởi tạo Dependency Injection (Composition Root), quản lý React state (`currentTopic`, `history`, `isLoading`, `error`).
* **Components Breakdown:**
  * `SearchHeader`: Thanh search + Preset topic pills + Status indicator của Gemini Key.
  * `SettingsModal`: Dialog modal nhập/lưu/xóa Gemini API Key.
  * `TopicOverview`: Thẻ tóm tắt trung lập.
  * `PerspectiveColumn`: 2 Cột so sánh trực quan (Pros vs Cons).
  * `EvidenceCard`: Badge hiển thị số liệu kiểm chứng (+40% Năng suất, 300M Việc làm...).
  * `CitationList`: Link trích dẫn bài nghiên cứu gốc từ các nguồn uy tín.
  * `SessionHistorySidebar`: Drawer/Sidebar lịch sử tra cứu trong phiên.
