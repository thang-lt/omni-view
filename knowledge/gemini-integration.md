# Gemini Integration

## 1. Cấu hình

```text
Model: gemini-3.5-flash-lite
Browser endpoint: POST /api/research/gemini
Upstream: /v1beta/models/{model}:generateContent
BYOK header tới gateway: x-gemini-api-key
Upstream auth header: x-goog-api-key
Thinking: minimal
Final analysis source cap: 8
Per-Scout grounded URL extraction: toàn bộ URL duy nhất trong response
```

Gateway từ chối `Content-Length` trên 80 KB, giới hạn prompt ở 50.000 ký tự, serialized response schema ở 20.000 ký tự và `maxOutputTokens` trong khoảng 200–3.000. Mỗi upstream attempt timeout 30 giây; status 429/5xx được retry tối đa 3 attempt với exponential delay và jitter. Response có `Cache-Control: no-store`; gateway không có code persistence key.

## 2. Calls per run

| Call | Search | Output |
|---|---:|---|
| Balanced Source Scout | Có | Text + grounding URLs |
| Counter-evidence Scout | Có | Text + grounding URLs |
| Perspective Analyst | Không | JSON 1–4 perspective có source indexes, tối đa 1.800 tokens |
| Provider Verification | Có, chỉ để kiểm tra provider | Text + grounding citations; mỗi provider chỉ thuộc một batch |
| Source Warning Auditor | Không | JSON source audit + provider assessment, lô tối đa 4 nguồn và tối đa 3.000 tokens/lô |
| Evidence Judge · Claim Ledger | Không | JSON 3-6 claims, tối đa 3.000 tokens |
| Evidence Judge · Report | Không | JSON report Markdown tối đa 650 từ, dựa trên Claim Ledger đã parse; tối đa 2.600 tokens |

Hai Scout chạy song song và không nhận output của nhau. Trên từng search response, gateway extract toàn bộ URL duy nhất trực tiếp từ grounding metadata theo các nhóm concurrency nhỏ; route không nhận URL tùy ý từ client. Use case sau đó dedupe và xen kẽ hai danh sách để chọn tối đa 8 URL cho tập nghiên cứu cuối. Gateway đồng thời giữ các segment trong `groundingSupports` theo đúng chunk nguồn. Nếu direct fetch thành công, packet vẫn có thể giữ cả passage trực tiếp và grounding-support; nếu direct fetch thất bại nhưng support segment tồn tại, trạng thái chính là `grounded-support`. Locator luôn ghi đây là nội dung model-generated được Google Search liên kết, không phải quote nguyên văn trang nguồn.

Use case tạo Provider Registry theo domain và lưu scout nào phát hiện mỗi đơn vị. Perspective Analyst đọc evidence packet, trả JSON có cấu trúc và application sinh Markdown ổn định. Source Warning Auditor chạy hai lượt theo lô tối đa 4 nguồn: Provider Verification search dạng text để kiểm tra ownership/affiliation, editorial orientation và reputation signals; sau đó structured audit không search nhận verification report và evidence packet. Mỗi provider chỉ được giao cho batch đầu tiên chứa provider đó. Nếu verification search lỗi/rỗng, structured audit vẫn chạy với assessment `unknown`/`limited-evidence`. Auditor phải trả danh sách URL verification dùng cho từng provider; parser chỉ giữ URL thật sự có trong citations của đúng response batch. Các audit được validate rồi hợp nhất. Judge nhận evidence packet, structured perspectives, provider assessments và structured source audits.

`Perspective.id` trong schema là `string`, vì vậy model có thể tạo nhãn mô tả như `official_authority_perspective` hoặc `critical_public_perspective`. Đây chỉ là định danh trình bày; parser dùng `sourceIndexes` để liên kết nguồn và không chuyển ID thành bias hoặc reliability classification.

## 3. Structured source audit

Auditor trả đúng một source audit cho mỗi index, gồm source type, stance, stakeholder groups và warnings. Warning taxonomy gồm conflict of interest, selection bias, methodology, factual reliability, misinformation risk, propaganda technique, hostile language, political framing, recency, geography và provenance.

Parser yêu cầu `evidenceQuote` dài tối thiểu 20 ký tự và xuất hiện trong một `evidencePassage` theo exact substring không phân biệt hoa thường. Nếu không đạt:

- `evidenceVerified = false`;
- severity bị hạ thành `info`;
- confidence bị hạ thành `low`;
- UI vẫn ghi `machine-only`; quote chỉ được hiển thị khi đã xác minh.

Quote hợp lệ lưu locator và provenance `direct`/`grounding-support`. Đây không phải semantic verifier và không chứng minh warning đúng chỉ vì chuỗi khớp.

## 4. Structured Judge output

Judge chạy hai lượt để báo cáo dài không làm mất mảng claim do giới hạn output: lượt đầu trả 3-6 claims có `evidenceLinks`, lượt sau viết `reportMarkdown` dựa trên Claim Ledger đã parse. Mỗi link khai báo `supports`, `contradicts` hoặc `context`. Parser bỏ citation nếu quote ngắn hơn 20 ký tự hoặc không khớp exact substring với evidence passage; citation hợp lệ lưu quote, source ID, quan hệ, provenance và character offset. Source indexes ngoài packet bị báo. Verdict thiếu đúng loại bằng chứng bị hạ về `unresolved/low`; `mixed` bắt buộc có cả support và contradiction. Claim chủ động unresolved không bị coi là citation gap chỉ vì chưa có evidence. Confidence `high` bị giới hạn còn `medium` nếu bằng chứng substantive chỉ là grounding-support. Pipeline dừng với lỗi rõ ràng thay vì lưu một Claim Ledger rỗng.

Character locator xác định vị trí quote trong passage trực tiếp hoặc grounding-support packet. Locator luôn phân biệt hai loại; cả hai đều chưa phải paragraph/page ổn định trong tài liệu gốc, và grounding-support không được trình bày như quote nguyên văn nguồn. Lượt report chỉ được diễn giải validated Claim Ledger theo 5 section cố định; Provider Registry và Source Warning không bị lặp lại toàn bộ trong report.

## 5. Error và giới hạn

- 400: gateway input sai.
- 401: thiếu/incomplete BYOK.
- Gemini 4xx không transient được chuyển về browser; 429/5xx được retry tối đa 3 attempt rồi mới trả kết quả cuối.
- Network gateway → Gemini: 502.
- Empty candidate hoặc không có grounding URL: run dừng.
- Đã có retry/backoff+jitter ở gateway; chưa streaming, cancel toàn run hoặc partial-result recovery.
- Hai Scout hoặc Perspective Analyst lỗi sau retry làm run dừng. Provider Verification lỗi được bắt riêng và chuyển thành báo cáo thiếu dữ liệu; structured audit/Judge lỗi vẫn làm run dừng.
- Chưa ghi token usage, exact model revision, prompt version hoặc search queries.
- Chưa có live Gemini E2E được chạy trong môi trường này vì không có API key hợp lệ được cung cấp cho test.

## 6. BYOK boundary

Key vẫn được browser giữ trong `sessionStorage` và gửi cho same-origin gateway ở từng call. Gateway giảm việc browser gọi trực tiếp upstream và tập trung request validation, nhưng chưa loại bỏ browser key exposure, chưa có vault/rate limiting và chưa phải production credential architecture.
