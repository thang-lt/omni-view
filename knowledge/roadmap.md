# Roadmap

## Đã hoàn thành trong prototype

- Hai Source Scout có chiến lược truy vấn khác nhau; gateway extract toàn bộ URL grounding duy nhất rồi final selector xen kẽ hai danh sách để chốt tối đa 8 nguồn.
- Same-origin Gemini gateway có body/prompt/schema/token bounds, timeout và retry cho 429/5xx.
- Public arbitrary source proxy đã được loại bỏ; gateway chỉ extract URL từ grounding metadata, với giới hạn redirect/timeout/bytes/content type.
- `runLiveResearch` use case và ports đã tách khỏi React page.
- JSON-encoded untrusted source packet.
- Evidence passages tách direct/grounding-support và giữ provenance khi cùng URL có cả hai loại.
- Structured Perspective với source links, stakeholder, assumptions, omissions, strongest counterargument và blind spots định tính.
- Provider Registry/Verification với một lượt Search mỗi provider và citation mapping theo URL.
- Structured source audit: warning quote tối thiểu 20 ký tự, verification/downgrade, locator/provenance display và `machine-only` status.
- Structured Claim Ledger với support/contradiction/context, exact quote ≥20 ký tự, character locator/provenance, verdict invariant và confidence cap cho grounding-only evidence.
- Report ngắn được sinh riêng từ validated Claim Ledger, không lặp lại toàn bộ Provider/Warning.
- Pure domain model/factories theo bounded context `research`.
- Source-family service theo canonical URL, exact fingerprint và explicit upstream IDs.
- D1 schema, indexes và migration đầu tiên.

## P0 — Hoàn thiện độ bền runtime

- `AbortController` cho cả run và nút cancel.
- `Promise.allSettled` và partial-result policy; mở rộng retry policy ngoài Gemini gateway khi cần.
- Prompt version, model revision, search query, token/cost và trace ID.
- Mock integration test toàn flow qua API routes.

## P1 — Truy nguyên evidence chính xác

- Paragraph/page/timestamp locator bền vững thay cho character offset trong excerpt.
- Snapshot/content hash bền vững và grounding support spans.
- Citation auditor kiểm tra semantic support, context và phản chứng bị bỏ qua.
- Evidence rows thật liên kết claim/warning; dùng domain factories trong live use case.
- PDF/document extraction an toàn.

## P2 — Provenance và research quality

- Trích upstream link/byline/publisher/ownership/funding metadata.
- Near-duplicate/fuzzy similarity và wire-copy detection; không gộp chỉ vì cùng publisher.
- Query planner đa ngôn ngữ/địa lý và dedicated primary-source verifier.
- Taxonomy/normalization tùy chọn cho Perspective ID nếu cần so sánh giữa nhiều run; hiện ID là nhãn model tự do.
- Benchmark bias/framing/hate false positives và confidence calibration.
- Scheduled re-check cho claim thay đổi theo thời gian.

## P3 — Durable persistence

- Viết repository cho D1 schema hiện có và nối vào use case.
- Cấu hình binding thật thay cho `.openai/hosting.json` `d1: null`.
- Apply/verify migration trên staging, retention và data migration policy.
- Server history, compare runs, export và read-only sharing.
- Human review/override record cho warnings.

## P4 — Production security/operations

- Bỏ BYOK khỏi browser mặc định: identity + secret vault/encrypted credentials.
- Rate limit, quota, abuse/cost controls và durable audit logs không chứa secret.
- DNS resolution/private-IP enforcement hoặc isolated egress fetcher; rate limit gateway/extraction để tiếp tục harden sau khi đã bỏ public proxy.
- CSP/security headers và prompt-injection regression suite.
- Observability, alerts và SLO cho gateway/extractor/pipeline.

## Definition of production-ready

- Mọi material claim truy tới locator chính xác và semantic citation audit.
- URL cùng upstream/copy không bị tính là độc lập.
- Một worker hoặc source lỗi không làm mất toàn run.
- API key không nằm trong browser storage mặc định.
- D1 binding, repository và migration được kiểm thử thật.
- Có human-review path cho warning quan trọng.
- Có live provider E2E, security tests và regression benchmark.
