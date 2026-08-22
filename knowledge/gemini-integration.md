# Gemini Integration

## 1. Cấu hình

```text
Model: gemini-3.5-flash-lite
Browser endpoint: POST /api/research/gemini
Upstream: /v1beta/models/{model}:generateContent
BYOK header tới gateway: x-gemini-api-key
Upstream auth header: x-goog-api-key
Thinking: minimal
URL cap toàn run: 8
```

Gateway từ chối `Content-Length` trên 80 KB, giới hạn prompt ở 50.000 ký tự, serialized response schema ở 20.000 ký tự và `maxOutputTokens` trong khoảng 200–3.000. Mỗi upstream attempt timeout 30 giây; status 429/5xx được retry tối đa 3 attempt với exponential delay và jitter. Response có `Cache-Control: no-store`; gateway không có code persistence key.

## 2. Calls per run

| Call | Search | Output |
|---|---:|---|
| Balanced Source Scout | Có | Text + grounding URLs |
| Counter-evidence Scout | Có | Text + grounding URLs |
| Perspective Analyst | Không | Markdown/text có source references |
| Source Warning Auditor | Có, chỉ để kiểm tra provider | JSON theo schema, lô tối đa 4 nguồn và tối đa 3.000 tokens/lô |
| Evidence Judge · Claim Ledger | Không | JSON 3-6 claims, tối đa 3.000 tokens |
| Evidence Judge · Report | Không | JSON report Markdown dựa trên Claim Ledger đã parse, tối đa 2.600 tokens |

Hai Scout chạy song song và không nhận output của nhau. Trên từng search response, gateway extract toàn bộ URL duy nhất trực tiếp từ grounding metadata theo các nhóm concurrency nhỏ; route không nhận URL tùy ý từ client. Use case sau đó mới gộp và chọn tối đa 8 URL cho tập nghiên cứu cuối. Gateway đồng thời giữ các segment trong `groundingSupports` theo đúng chunk nguồn. Nếu trang nguồn không thể được fetch trực tiếp nhưng support segment tồn tại, packet dùng trạng thái `grounded-support` và locator ghi rõ đây là nội dung model-generated được Google Search liên kết, không phải quote nguyên văn trang nguồn. Use case tạo Provider Registry theo domain và lưu scout nào phát hiện mỗi đơn vị. Perspective Analyst đọc evidence packet không search. Source Warning Auditor chạy hai lượt theo lô tối đa 4 nguồn: Provider Verification search dạng text để kiểm tra ownership/affiliation, editorial orientation và reputation signals; sau đó structured audit không search nhận verification report và evidence packet. Nếu verification search lỗi/rỗng, structured audit vẫn chạy với assessment `unknown`/`limited-evidence`. Các audit được validate rồi hợp nhất trước khi tính coverage. Judge nhận packet, provider assessments và hai output phân tích.

## 3. Structured source audit

Auditor trả đúng một source audit cho mỗi index, gồm source type, stance, stakeholder groups, coverage tags và warnings. Warning taxonomy gồm conflict of interest, selection bias, methodology, factual reliability, misinformation risk, propaganda technique, hostile language, political framing, recency, geography và provenance.

Parser yêu cầu `evidenceQuote` dài tối thiểu 20 ký tự và xuất hiện trong excerpt theo exact substring không phân biệt hoa thường. Nếu không đạt:

- `evidenceVerified = false`;
- severity bị hạ thành `info`;
- confidence bị hạ thành `low`;
- UI vẫn ghi `machine-only`; quote chỉ được hiển thị khi đã xác minh.

Đây không phải semantic verifier và không chứng minh warning đúng chỉ vì chuỗi khớp.

## 4. Structured Judge output

Judge chạy hai lượt để báo cáo dài không làm mất mảng claim do giới hạn output: lượt đầu trả 3-6 claims có `evidenceQuotes`, lượt sau viết `reportMarkdown` dựa trên Claim Ledger đã parse. Parser bỏ citation nếu quote không khớp exact substring với excerpt; citation hợp lệ lưu quote, source ID và character offset. Source indexes ngoài packet bị báo; claim không còn citation hợp lệ được ghi vào citation gap. Pipeline dừng với lỗi rõ ràng thay vì lưu một Claim Ledger rỗng.

Character locator xác định vị trí quote trong excerpt trực tiếp hoặc grounding-support packet. Locator luôn phân biệt hai loại; cả hai đều chưa phải paragraph/page ổn định trong tài liệu gốc, và grounding-support không được trình bày như quote nguyên văn nguồn.

## 5. Error và giới hạn

- 400: gateway input sai.
- 401: thiếu/incomplete BYOK.
- Gemini 4xx không transient được chuyển về browser; 429/5xx được retry tối đa 3 attempt rồi mới trả kết quả cuối.
- Network gateway → Gemini: 502.
- Empty candidate hoặc không có grounding URL: run dừng.
- Đã có retry/backoff+jitter ở gateway; chưa streaming, cancel toàn run hoặc partial-result recovery.
- Một request trong `Promise.all` lỗi làm run dừng.
- Chưa ghi token usage, exact model revision, prompt version hoặc search queries.
- Chưa có live Gemini E2E được chạy trong môi trường này vì không có API key hợp lệ được cung cấp cho test.

## 6. BYOK boundary

Key vẫn được browser giữ trong `sessionStorage` và gửi cho same-origin gateway ở từng call. Gateway giảm việc browser gọi trực tiếp upstream và tập trung request validation, nhưng chưa loại bỏ browser key exposure, chưa có vault/rate limiting và chưa phải production credential architecture.
