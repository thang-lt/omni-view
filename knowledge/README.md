# Knowledge Base — Đa Chiều Research Desk

Thư mục này là điểm bắt đầu để hiểu, phát triển và kiểm tra dự án.

## Bản đồ tài liệu

| Tài liệu | Nội dung |
|---|---|
| [project-overview.md](project-overview.md) | Tổng quan sản phẩm, phạm vi hiện tại và cấu trúc source |
| [product-spec.md](product-spec.md) | Đối tượng sử dụng, use case, yêu cầu chức năng và acceptance criteria |
| [system-design.md](system-design.md) | Kiến trúc runtime, component, state machine và luồng multi-agent |
| [data-model.md](data-model.md) | Model dữ liệu hiện tại và schema mục tiêu |
| [gemini-integration.md](gemini-integration.md) | BYOK, prompt orchestration, Google Search grounding và lỗi API |
| [ui-design-system.md](ui-design-system.md) | Design language, layout, token, component và responsive |
| [security-and-trust.md](security-and-trust.md) | Threat model, key handling, prompt injection và trust boundaries |
| [testing-and-operations.md](testing-and-operations.md) | Build, test, quan sát lỗi và checklist phát hành |
| [roadmap.md](roadmap.md) | Khoảng cách giữa prototype và hệ thống production |

## Nguồn sự thật

Ưu tiên khi tài liệu và code mâu thuẫn:

1. Hành vi runtime đã kiểm tra được.
2. Source trong `app/`, `application/`, `domain/`, `infrastructure/`, `components/`, `worker/`, `db/` và cấu hình build.
3. Các tài liệu trong `knowledge/`.
4. Thiết kế nền ban đầu tại `work/MULTI_AGENT_RESEARCH_DESIGN.md`.

Các tài liệu trong thư mục này mô tả snapshot được quét ngày **2026-08-23**.

## Thuật ngữ

- **Live-only mode:** pipeline chỉ gọi Gemini API bằng key người dùng nhập trong browser; không có dữ liệu fallback.
- **Grounding source:** URL nằm trong `groundingMetadata` do Gemini trả về.
- **Direct passage:** excerpt được Server Extractor đọc từ trang nguồn.
- **Grounding-support passage:** nội dung model-generated trong `groundingSupports` được Search liên kết với URL; không phải nguyên văn trang nguồn.
- **Source family:** các tài liệu cùng phụ thuộc một nguồn gốc/upstream evidence.
- **Provider:** đơn vị xuất bản/cung cấp thông tin, hiện được registry theo domain.
- **Perspective ID:** nhãn chuỗi tự do do model đặt cho một góc nhìn; không phải taxonomy cố định hoặc thang uy tín.
- **Claim:** mệnh đề nguyên tử có thể kiểm tra hoặc phân loại.
- **Evidence Judge:** bước tổng hợp không bỏ phiếu theo số agent hoặc số URL.
- **Source Warning:** tín hiệu máy về framing, bias, phương pháp, provenance hoặc factual-risk; không phải phán quyết cho cả nguồn.
