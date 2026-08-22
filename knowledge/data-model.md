# Data Model

## 1. Domain contracts đã triển khai

`domain/research` định nghĩa và validate các immutable record:

- `SourceRecord`: canonical URL, publisher/authors, type, stakeholder, ownership/funding, upstream IDs, family và full-text status.
- `EvidenceRecord`: source ID, quote, locator, surrounding context, extraction time và content hash.
- `ClaimRecord`: claim type, evidence hỗ trợ/phản chứng, assumptions, verdict và confidence reason.
- `WarningRecord`: target, taxonomy, observable indicator, evidence IDs, alternative explanation, severity, confidence và review status.
- `CoverageReport`: 7 requirements, nhóm đã có/thiếu, ratio và complete flag.

Factory bắt buộc HTTP(S), cấm source tự tham chiếu upstream, cấm một evidence vừa support vừa contradict, yêu cầu evidence cho verdict supported/unsupported và yêu cầu warning có evidence.

## 2. Live application artifacts

Live UI dùng các artifact gần với domain nhưng chưa đồng nhất hoàn toàn:

```ts
type ExtractedSourcePacket = {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  locator: string; // hiện là "server-extracted excerpt" hoặc "metadata-only"
  fullTextStatus: "read" | "partial" | "metadata-only" | "inaccessible";
};

type SourceWarningArtifact = {
  category: WarningCategory;
  observableIndicator: string;
  evidenceQuote: string;
  evidenceVerified: boolean;
  alternativeExplanation: string | null;
  severity: "info" | "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  confidenceReason: string;
  verificationHint: string;
  reviewStatus: "machine-only";
};

type ClaimArtifact = {
  id: string;
  text: string;
  type: "empirical" | "causal" | "predictive" | "interpretive" | "normative";
  verdict: "supported" | "mixed" | "unsupported" | "unresolved";
  confidence: "low" | "medium" | "high";
  citations: Array<{
    sourceId: string;
    locator: string; // source locator + character offset trong excerpt
    quote: string;
    evidenceVerified: true;
  }>;
  contradictingSourceIds: string[];
  unresolvedQuestions: string[];
};
```

Warning artifact giữ `evidenceQuote`; quote chỉ được xác minh nếu dài tối thiểu 20 ký tự và là exact substring của excerpt. Claim citation cũng yêu cầu exact substring nhưng chỉ cần quote không rỗng. Coverage tags được lọc qua allowlist 7 giá trị, tối đa 4 tag/nguồn và bị xóa với nguồn không `read`/`partial`.

Local `GeminiResearch` còn lưu report, tối đa 8 citations, agent outputs, heuristic source clusters, audit status, coverage, claims, citation audit và model. History nằm tại `localStorage` key `research-desk:runs:v2`, tối đa 5 record và 20 log/record.

## 3. D1 schema và migration

`db/schema.ts` và `drizzle/0000_demonic_terrax.sql` đã có:

- `research_runs`
- `evidence_families`
- `sources`
- `evidence`
- `claims`
- `claim_evidence`
- `warnings`
- `agent_logs`

Schema có foreign keys, cascade policy, unique/indexes và JSON text fields cho arrays/metadata. Migration metadata cũng đã được tạo.

## 4. Persistence status

Schema không đồng nghĩa persistence đã hoạt động:

- Pipeline chưa gọi repository hoặc ghi các table.
- History thực tế vẫn ở browser.
- `.openai/hosting.json` đặt `d1: null`; không có binding production từ file này.
- `db/index.ts` chỉ cung cấp accessor và sẽ báo lỗi nếu thiếu binding.
- Chưa có migration deployment verification hoặc data migration từ local history.

Không được lưu Gemini API key vào D1.

## 5. Khoảng cách model còn lại

- Live claim evidence có character offset trong excerpt, nhưng chưa có paragraph/page/timestamp locator ổn định hoặc durable content hash.
- Warning evidence link trong UI được suy ra từ excerpt, chưa có Evidence row runtime.
- Source ownership, funding và upstream metadata chưa được tự động enrich.
- Chưa lưu prompt version, search query, token usage hoặc raw grounding support spans trong run.
