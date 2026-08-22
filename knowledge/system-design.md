# System Design

## 1. Kiến trúc đang chạy

```mermaid
flowchart LR
    U["Browser user"] --> O["React orchestrator"]
    O --> LS["localStorage: 5 runs"]
    O --> SS["sessionStorage: BYOK"]
    O --> GW["POST /api/research/gemini"]
    GW --> G["Gemini generateContent"]
    G --> GS["Google Search grounding"]
    GW -->|"chỉ URL từ grounding metadata"| EX["Internal bounded extractor"]
    EX --> WEB["Grounded public HTTP(S) sources"]
    O --> AP["Application artifact services"]
    AP --> UI["Coverage / Claims / Warnings"]
    D1["D1 schema + migration"] -. "chưa nối runtime" .-> O
```

Gateway cùng origin nhận BYOK cho từng request, validate body/prompt/token/schema rồi forward sang Gemini. Với search response thành công, chính gateway lấy tối đa 8 URL duy nhất từ grounding metadata và extract; không còn API đọc URL tùy ý từ browser. Gateway không phải secret vault: key vẫn bắt đầu ở browser và đi qua gateway process.

## 2. Pipeline live

```mermaid
sequenceDiagram
    participant O as Browser Orchestrator
    participant G as Gemini Gateway
    participant E as Source Extractor

    par Independent search prompts
      O->>G: Balanced Scout + google_search
    and
      O->>G: Counter-evidence Scout + google_search
    end
    O->>O: Exact URL dedupe, cap 8
    G->>E: Grounding URLs only
    E-->>O: Extractions đi kèm Scout response
    O->>O: Canonical URL/exact fingerprint source families
    par No-search analysis
      O->>G: Perspective Analyst + evidence packet
    and
      O->>G: Source Warning Auditor + JSON schema
    end
    O->>O: Verify warning quote ≥20 chars; readable-only coverage
    O->>G: Evidence Judge + JSON schema, no search
    O->>O: Exact quote match + character locator + citation status
```

## 3. Layer responsibilities

| Layer | Thành phần | Trách nhiệm |
|---|---|---|
| Domain | `domain/research/*` | Immutable contracts, factories và invariant cho source/evidence/claim/warning/coverage |
| Application | `run-live-research.ts` | Live use case; điều phối 5 operation qua ports, family/coverage/audit/Judge và completion logs |
| Application | `pipeline-artifacts.ts` | Evidence packet, parse và downgrade audit, parse Judge claims |
| Application | `source-intelligence.ts` | URL canonicalization, source families, coverage và citation completeness |
| Infrastructure | `source/extraction.ts` | Bounded fetch, redirect validation, readable-text extraction |
| Infrastructure | `gemini/request.ts` | Validate gateway request và token bounds |
| Delivery | Gemini API route | Same-origin proxy, retry/bounds và extraction chỉ từ grounded URLs |
| Presentation | `page.tsx`, components | Port adapters, local state/history và artifact rendering |
| Persistence | `db/schema.ts`, migration | Schema sẵn có nhưng chưa có repository/use case ghi D1 |

## 4. Source-family semantics

Pure service tạo heuristic cluster khi có ít nhất một quan hệ sau:

- canonical URL giống nhau;
- `contentFingerprint` giống hệt;
- `upstreamSourceIds` chỉ rõ quan hệ.

Live runtime đưa tối đa 3.000 ký tự mỗi nguồn vào evidence packet, tạo fingerprint từ 1.200 ký tự đầu của excerpt sau normalize và chưa trích/populate upstream ID. Vì vậy cluster chỉ là chỉ báo sơ bộ, chưa phải provenance graph, semantic similarity, wire-copy hay ownership detection.

Evidence packet là một JSON object được `JSON.stringify` và đặt trong `<UNTRUSTED_SOURCE_DATA_JSON>`. Cách này giữ source text ở trường dữ liệu thay vì ghép delimiter tự do, nhưng không tự loại bỏ indirect prompt injection.

## 5. Failure behavior

- Hai Scout và hai analysis worker dùng `Promise.all`; một request lỗi sau retry làm run dừng.
- Mỗi source extraction có fallback `inaccessible`, nên một nguồn không đọc được không tự làm mất cả run.
- Không grounding URL: dừng, không tạo báo cáo giả.
- Gateway retry 429/5xx tối đa 3 attempt với exponential delay + jitter; mỗi Gemini attempt timeout 30 giây.
- Gateway giới hạn request body theo `Content-Length` 80 KB, prompt 50.000 ký tự, response schema 20.000 ký tự và output 200–3.000 tokens.
- Chưa streaming, cancel toàn use case hoặc partial-result policy. Extractor có AbortController nội bộ cho timeout từng source fetch.
- Storage lỗi bị bỏ qua; D1 chưa tham gia runtime.

## 6. Giới hạn truy nguyên

Judge phải trả `evidenceQuotes`. Parser chỉ tạo citation khi quote không rỗng và là exact substring không phân biệt hoa thường trong excerpt tương ứng; locator thêm character offset. Điều này mạnh hơn chỉ kiểm tra source index, nhưng character offset thuộc excerpt chứ không phải vị trí bền vững trong tài liệu gốc và chưa kiểm định semantic support/context omission.
