# Data Model

## 1. Domain contracts đã triển khai

`domain/research` định nghĩa và validate các immutable record:

- `SourceRecord`: canonical URL, publisher/authors, type, stakeholder, ownership/funding, upstream IDs, family và full-text status.
- `EvidenceRecord`: source ID, quote, locator, surrounding context, extraction time và content hash.
- `ClaimRecord`: claim type, evidence hỗ trợ/phản chứng, assumptions, verdict và confidence reason.
- `WarningRecord`: target, taxonomy, observable indicator, evidence IDs, alternative explanation, severity, confidence và review status.

Factory bắt buộc HTTP(S), cấm source tự tham chiếu upstream, cấm một evidence vừa support vừa contradict, yêu cầu evidence cho verdict supported/unsupported và yêu cầu warning có evidence.

## 2. Live application artifacts

Live UI dùng các artifact gần với domain nhưng chưa đồng nhất hoàn toàn:

```ts
type ExtractedSourcePacket = {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  locator: string; // locator của passage chính để tương thích history cũ
  fullTextStatus: "read" | "partial" | "grounded-support" | "metadata-only" | "inaccessible";
  evidencePassages?: Array<{
    kind: "direct" | "grounding-support";
    text: string;
    locator: string;
  }>;
};

type SourceWarningArtifact = {
  category: WarningCategory;
  observableIndicator: string;
  evidenceQuote: string;
  evidenceVerified: boolean;
  evidenceLocator?: string;
  evidenceProvenance?: "direct" | "grounding-support";
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
  confidenceReason: string;
  citations: Array<{
    relationship: "supports" | "contradicts" | "context";
    sourceId: string;
    locator: string; // passage locator + character offset
    quote: string;
    textMatchVerified: true;
    provenance: "direct" | "grounding-support";
  }>;
  contradictingSourceIds: string[];
  unresolvedQuestions: string[];
};

type PerspectiveArtifact = {
  perspectives: Array<{
    id: string; // nhãn model tự do, không phải taxonomy cố định
    thesis: string;
    sourceIds: string[];
    stakeholderGroups: string[];
    assumptions: string[];
    omissions: string[];
    strongestCounterargument: string;
  }>;
  blindSpots: string[];
  markdown: string; // được sinh deterministically từ dữ liệu trên
};

type ProviderAssessmentArtifact = {
  providerId: string;
  providerName: string;
  reputationAssessment: "established" | "mixed" | "limited-evidence" | "unknown";
  politicalOrientation: string;
  ownershipAndAffiliations: string[];
  reputationSignals: string[];
  caveats: string[];
  verificationCitations: Array<{ title: string; url: string }>;
  reviewStatus: "machine-only";
};
```

Warning artifact giữ `evidenceQuote`; quote chỉ được xác minh nếu dài tối thiểu 20 ký tự và là exact substring của một evidence passage. Claim citation áp dụng cùng ngưỡng, lưu quan hệ support/contradiction/context và provenance. Verdict được kiểm tra theo quan hệ citation; claim chỉ dựa vào grounding-support bị giới hạn confidence ở `medium`.

`PerspectiveArtifact` lưu 1–4 góc nhìn có thesis, source IDs, stakeholder groups, assumptions, omissions và phản biện mạnh nhất; Markdown UI được tạo deterministically từ artifact. Các ID như `official_authority_perspective` hoặc `critical_public_perspective` chỉ là nhãn model tự do. `ProviderAssessmentArtifact.verificationCitations` chỉ chứa các URL mà Auditor khai báo cho đúng provider và parser đối chiếu được với grounding citations của batch.

Local `GeminiResearch` còn lưu report, tối đa 8 citations, agent outputs, heuristic source clusters, audit status, claims, citation audit và model. History nằm tại `localStorage` key `research-desk:runs:v2`, tối đa 5 record và 20 log/record.

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
- Warning evidence locator trong UI được xác minh lại từ evidence passages khi hydrate history, nhưng chưa có Evidence row runtime.
- Source ownership, funding và upstream metadata chưa được tự động enrich.
- Chưa lưu prompt version, search query, token usage hoặc raw grounding support spans trong run.
