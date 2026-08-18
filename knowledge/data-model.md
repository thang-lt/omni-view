# Data Model

## 1. Model hiện có trong code

### Gemini result

```ts
type GeminiCitation = { title: string; url: string };
type GeminiAgentOutput = {
  name: string;
  role: string;
  text: string;
  citations: GeminiCitation[];
};
type GeminiResearch = {
  report: string;
  citations: GeminiCitation[];
  agents: GeminiAgentOutput[];
  sourceBiasNotes: SourceBiasNote[];
  model: string;
};

type SourceBiasNote = {
  url: string;
  signals: string[];
  note: string;
  confidence: "Cao" | "Vừa" | "Thấp";
  verificationHint: string;
};

type ResearchHistoryItem = {
  id: string;
  topic: string;
  completedAt: string;
  result: GeminiResearch;
  logs: string[];
};
```

`ResearchHistoryItem[]` được lưu tại `localStorage` key `research-desk:runs:v1`, theo thứ tự mới nhất trước và tối đa năm phần tử. Mỗi phiên giữ tối đa 20 dòng nhật ký điều phối. Khi hydrate, app loại record sai shape, ngày không hợp lệ, log không phải chuỗi và citation URL không phải `http/https`.

## 2. Hạn chế model hiện tại

- Live output chủ yếu là text không cấu trúc.
- Citation chưa có locator hoặc quan hệ với claim.
- Phiên cục bộ có ID và thời điểm hoàn tất, nhưng chưa có thời điểm bắt đầu hoặc version prompt.
- Không lưu truy vấn grounding.
- Không biểu diễn source family thật.
- Không lưu dissent hoặc update trigger ở dạng máy đọc được.

## 3. Schema mục tiêu

### ResearchRun

```ts
type ResearchRun = {
  id: string;
  topic: string;
  status: "draft" | "running" | "paused" | "complete" | "failed";
  mode: "gemini-live";
  model: string | null;
  promptVersion: string;
  startedAt: string;
  completedAt: string | null;
  scope: ResearchScope;
  logs: AgentLog[];
};
```

### SourceRecord

```ts
type SourceRecord = {
  id: string;
  runId: string;
  canonicalUrl: string;
  title: string;
  publisher: string | null;
  author: string[];
  publishedAt: string | null;
  accessedAt: string;
  language: string | null;
  sourceType: string;
  stakeholderGroups: string[];
  evidenceFamilyId: string | null;
  upstreamSourceIds: string[];
  fullTextStatus: "read" | "partial" | "metadata-only" | "inaccessible";
  ownershipFundingNotes: string[];
};
```

### ClaimRecord

```ts
type ClaimRecord = {
  id: string;
  runId: string;
  normalizedText: string;
  originalQuote: string | null;
  type: "empirical" | "causal" | "predictive" | "interpretive" | "normative";
  sourceIds: string[];
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  assumptions: string[];
  verdict: string;
  confidence: "high" | "medium" | "low" | "indeterminate";
  confidenceReason: string;
  unresolvedQuestions: string[];
};
```

### AuditRecord

```ts
type AuditRecord = {
  id: string;
  targetType: "source" | "claim" | "report";
  targetId: string;
  auditType: "factuality" | "bias" | "political-framing" | "logic" | "citation";
  finding: string;
  observableIndicator: string;
  severity: "info" | "low" | "medium" | "high";
  evidenceIds: string[];
  alternativeExplanation: string | null;
  confidence: number;
};
```

## 4. Persistence

Hiện tại lịch sử chỉ nằm trong browser; `db/schema.ts` trống và D1 chưa được khai báo. Nếu cần đồng bộ lịch sử qua thiết bị, schema đầu tiên nên gồm:

- `research_runs`.
- `sources`.
- `evidence_families`.
- `claims`.
- `claim_evidence`.
- `audits`.
- `agent_logs`.

Không lưu Gemini API key vào database.
