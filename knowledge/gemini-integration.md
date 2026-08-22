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
| Source Warning Auditor | Không | JSON theo schema, lô tối đa 4 nguồn và tối đa 3.000 tokens/lô |
| Evidence Judge | Không | JSON report + claims, tối đa 2.600 tokens |

Hai Scout chạy song song và không nhận output của nhau. Trên từng search response, gateway lấy tối đa 8 URL duy nhất trực tiếp từ grounding metadata và extract nội bộ; route không nhận URL tùy ý từ client. Use case gộp citation/extraction, đưa toàn bộ packet cho Perspective Analyst và chia Source Auditor thành các lô tối đa 4 nguồn. Các audit được validate rồi hợp nhất trước khi tính coverage. Judge nhận packet và hai output phân tích.

## 3. Structured source audit

Auditor trả đúng một source audit cho mỗi index, gồm source type, stance, stakeholder groups, coverage tags và warnings. Warning taxonomy gồm conflict of interest, selection bias, methodology, factual reliability, misinformation risk, propaganda technique, hostile language, political framing, recency, geography và provenance.

Parser yêu cầu `evidenceQuote` dài tối thiểu 20 ký tự và xuất hiện trong excerpt theo exact substring không phân biệt hoa thường. Nếu không đạt:

- `evidenceVerified = false`;
- severity bị hạ thành `info`;
- confidence bị hạ thành `low`;
- UI vẫn ghi `machine-only`; quote chỉ được hiển thị khi đã xác minh.

Đây không phải semantic verifier và không chứng minh warning đúng chỉ vì chuỗi khớp.

## 4. Structured Judge output

Judge trả `reportMarkdown` và tối đa 12 claims, gồm `evidenceQuotes`. Parser bỏ citation nếu quote không khớp exact substring với excerpt; citation hợp lệ lưu quote, source ID và character offset. Source indexes ngoài packet bị báo; claim không còn citation hợp lệ được ghi vào citation gap.

Character locator xác định vị trí quote trong excerpt đã trích xuất, chưa phải grounding support span hoặc paragraph/page ổn định trong tài liệu gốc.

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
