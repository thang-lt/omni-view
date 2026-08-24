# Đa Chiều — Multi-Agent Research Desk

Prototype nghiên cứu đa nguồn cho các sự kiện và luận điểm có tranh chấp. Ứng dụng dùng Gemini Google Search grounding để tìm nguồn chính thống lẫn phản chứng, giữ provenance của evidence, cảnh báo framing/bias ở cấp nguồn và tạo Claim Ledger có quote kiểm chứng trước khi viết báo cáo.

> Hệ thống hỗ trợ kiểm tra bằng chứng, không tự tuyên bố “AI đã xác định sự thật”. Warning và provider assessment đều là kết quả máy, cần người duyệt khi dùng cho quyết định quan trọng.

## Kết quả một phiên nghiên cứu

- Báo cáo Markdown ngắn, được diễn giải từ Claim Ledger đã validate.
- Claim Ledger với verdict `supported`, `mixed`, `unsupported` hoặc `unresolved`.
- Evidence link phân biệt `supports`, `contradicts` và `context`.
- Provider Registry + Source Audit: gộp ownership/affiliation, reputation, thiên hướng biên tập và warning có evidence theo từng đơn vị/nguồn; hiển thị ngay dưới Analysis Roles.
- Source family heuristic, trạng thái đọc nguồn và lịch sử tối đa 5 phiên trong browser.

## Flow hiện tại

1. Balanced Source Scout tìm nguồn sơ cấp, dữ liệu gốc và nguồn có phương pháp.
2. Counter-evidence Scout độc lập tìm phản chứng, bên phản biện và nhóm chịu tác động.
3. Gateway extract tất cả URL duy nhất trong grounding metadata của từng Scout; application dedupe và xen kẽ hai danh sách để chốt tối đa 8 nguồn phân tích.
4. Server Extractor đọc nội dung có giới hạn. Mỗi nguồn có thể giữ cả passage `direct` và `grounding-support` với provenance riêng.
5. Perspective Analyst tạo 1–4 góc nhìn có cấu trúc. Provider Verification dùng Search để kiểm tra đơn vị xuất bản; Source Warning Auditor sau đó audit evidence mà không Search thêm.
6. Evidence Judge tạo Claim Ledger. Quote tối thiểu 20 ký tự phải khớp evidence passage; verdict thiếu đúng quan hệ support/contradiction sẽ bị hạ về `unresolved/low`.
7. Evidence Judge viết report tối đa 650 từ, chỉ diễn giải Claim Ledger đã validate.

## Cách hiểu Perspective

`Perspective.id` là nhãn chuỗi tự do do Gemini tạo, không phải taxonomy cố định hoặc thang uy tín. Ví dụ:

- `official_authority_perspective`: góc nhìn của cơ quan chính thức hoặc bên có thẩm quyền.
- `critical_public_perspective`: góc nhìn phản biện từ công chúng, báo chí, tổ chức xã hội hoặc nhóm chịu tác động.

Nguồn chính thức không mặc nhiên đúng; góc nhìn phản biện cũng không mặc nhiên khách quan. Mọi kết luận factual vẫn phải đi qua Claim Ledger.

## Chạy local

Yêu cầu:

- Node.js `>=22.13.0`.
- Gemini API key có quyền dùng Generative Language API và Google Search grounding.

```bash
npm install
npm run dev
```

Mở URL được dev server in ra, chọn **Kết nối Gemini**, nhập key và bắt đầu một phiên nghiên cứu. Key chỉ nằm trong `sessionStorage` nhưng vẫn đi qua same-origin gateway; nên dùng key thử nghiệm có quota và phạm vi quyền hạn chế.

Nếu shell trên macOS đang ưu tiên Node 20 trong Homebrew:

```bash
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run dev
```

## Kiểm tra

```bash
npm test
npm run lint
```

`npm test` gồm production build và toàn bộ Node test. Test hiện dùng mock/fake Gemini response; chưa thay thế smoke E2E với API key và quota thật.

## Kiến trúc chính

```text
app/page.tsx                         Browser UI, state và local history
app/api/research/gemini/route.ts     Same-origin Gemini gateway
application/research/                Pipeline, artifact parsers và source intelligence
domain/research/                     Immutable domain contracts và invariants
infrastructure/source/               Bounded grounded-source extraction
components/research-artifacts.tsx    Claim Ledger và Warning panels
db/                                  D1 schema; chưa nối vào runtime
knowledge/                           Tài liệu sản phẩm, kỹ thuật và vận hành
tests/                               Domain/application/infrastructure/SSR tests
```

## Giới hạn quan trọng

- Exact quote matching là lexical verification, chưa chứng minh semantic entailment hoặc quote đủ ngữ cảnh.
- Grounding-support là nội dung model-generated được Search liên kết với URL, không phải nguyên văn trang nguồn; confidence claim chỉ dựa vào loại này bị giới hạn ở `medium`.
- Source family mới là heuristic, chưa phải provenance/ownership graph hoàn chỉnh.
- Chưa có PDF/media extraction, DNS-resolution SSRF defense, cancel/partial recovery hoặc human-review workflow.
- D1 có schema và migration nhưng runtime vẫn lưu history trong `localStorage`.
- Không nhập topic hoặc dữ liệu bí mật vào pipeline nghiên cứu web.

## Tài liệu

Bắt đầu tại [knowledge/README.md](knowledge/README.md). Tài liệu chi tiết gồm product spec, system design, Gemini integration, data model, security/trust, UI, testing/operations và roadmap.
