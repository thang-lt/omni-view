import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const researchRuns = sqliteTable("research_runs", {
  id: text("id").primaryKey(),
  topic: text("topic").notNull(),
  status: text("status", { enum: ["draft", "running", "paused", "complete", "failed"] }).notNull(),
  mode: text("mode").notNull(),
  model: text("model"),
  promptVersion: text("prompt_version").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  scope: text("scope", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  reportMarkdown: text("report_markdown"),
  ...timestamps,
}, (table) => [
  index("research_runs_status_started_idx").on(table.status, table.startedAt),
  index("research_runs_completed_idx").on(table.completedAt),
]);

export const evidenceFamilies = sqliteTable("evidence_families", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => researchRuns.id, { onDelete: "cascade" }),
  canonicalKey: text("canonical_key").notNull(),
  rootSourceId: text("root_source_id"),
  label: text("label"),
  provenanceNotes: text("provenance_notes", { mode: "json" }).$type<string[]>().notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("evidence_families_run_key_uidx").on(table.runId, table.canonicalKey),
  index("evidence_families_run_idx").on(table.runId),
  index("evidence_families_root_source_idx").on(table.rootSourceId),
]);

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => researchRuns.id, { onDelete: "cascade" }),
  evidenceFamilyId: text("evidence_family_id").references(() => evidenceFamilies.id, { onDelete: "set null" }),
  canonicalUrl: text("canonical_url").notNull(),
  title: text("title").notNull(),
  publisher: text("publisher"),
  authors: text("authors", { mode: "json" }).$type<string[]>().notNull(),
  publishedAt: text("published_at"),
  accessedAt: text("accessed_at").notNull(),
  language: text("language"),
  sourceType: text("source_type").notNull(),
  stakeholderGroups: text("stakeholder_groups", { mode: "json" }).$type<string[]>().notNull(),
  coverageTags: text("coverage_tags", { mode: "json" }).$type<string[]>().notNull(),
  upstreamSourceIds: text("upstream_source_ids", { mode: "json" }).$type<string[]>().notNull(),
  fullTextStatus: text("full_text_status", { enum: ["read", "partial", "grounded-support", "metadata-only", "blocked", "inaccessible"] }).notNull(),
  ownership: text("ownership"),
  fundingNotes: text("funding_notes", { mode: "json" }).$type<string[]>().notNull(),
  contentHash: text("content_hash"),
  ...timestamps,
}, (table) => [
  uniqueIndex("sources_run_canonical_url_uidx").on(table.runId, table.canonicalUrl),
  index("sources_run_idx").on(table.runId),
  index("sources_family_idx").on(table.evidenceFamilyId),
  index("sources_run_type_idx").on(table.runId, table.sourceType),
  index("sources_publisher_idx").on(table.publisher),
  index("sources_published_idx").on(table.publishedAt),
]);

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => researchRuns.id, { onDelete: "cascade" }),
  sourceId: text("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  quote: text("quote").notNull(),
  locator: text("locator").notNull(),
  contextBefore: text("context_before").notNull(),
  contextAfter: text("context_after").notNull(),
  extractedAt: text("extracted_at").notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("evidence_run_idx").on(table.runId),
  index("evidence_source_idx").on(table.sourceId),
  uniqueIndex("evidence_source_hash_locator_uidx").on(table.sourceId, table.contentHash, table.locator),
]);

export const claims = sqliteTable("claims", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => researchRuns.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  normalizedText: text("normalized_text").notNull(),
  type: text("type", { enum: ["empirical", "causal", "predictive", "interpretive", "normative"] }).notNull(),
  verdict: text("verdict", { enum: ["supported", "mixed", "unsupported", "unresolved"] }).notNull(),
  confidence: text("confidence", { enum: ["low", "medium", "high"] }).notNull(),
  confidenceReason: text("confidence_reason").notNull(),
  assumptions: text("assumptions", { mode: "json" }).$type<string[]>().notNull(),
  unresolvedQuestions: text("unresolved_questions", { mode: "json" }).$type<string[]>().notNull(),
  isMaterial: integer("is_material", { mode: "boolean" }).notNull(),
  ...timestamps,
}, (table) => [
  index("claims_run_idx").on(table.runId),
  index("claims_run_verdict_idx").on(table.runId, table.verdict),
  index("claims_run_type_idx").on(table.runId, table.type),
]);

export const claimEvidence = sqliteTable("claim_evidence", {
  claimId: text("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
  evidenceId: text("evidence_id").notNull().references(() => evidence.id, { onDelete: "cascade" }),
  relationship: text("relationship", { enum: ["supports", "contradicts", "context"] }).notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.claimId, table.evidenceId, table.relationship] }),
  index("claim_evidence_claim_relationship_idx").on(table.claimId, table.relationship),
  index("claim_evidence_evidence_idx").on(table.evidenceId),
]);

export const warnings = sqliteTable("warnings", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => researchRuns.id, { onDelete: "cascade" }),
  targetType: text("target_type", { enum: ["source", "claim", "evidence", "report"] }).notNull(),
  targetId: text("target_id").notNull(),
  category: text("category").notNull(),
  observableIndicator: text("observable_indicator").notNull(),
  evidenceIds: text("evidence_ids", { mode: "json" }).$type<string[]>().notNull(),
  alternativeExplanation: text("alternative_explanation"),
  severity: text("severity", { enum: ["info", "low", "medium", "high"] }).notNull(),
  confidence: text("confidence", { enum: ["low", "medium", "high"] }).notNull(),
  confidenceReason: text("confidence_reason").notNull(),
  verificationHint: text("verification_hint").notNull(),
  status: text("status", { enum: ["machine-only", "cross-checked", "human-reviewed"] }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("warnings_run_idx").on(table.runId),
  index("warnings_target_idx").on(table.targetType, table.targetId),
  index("warnings_run_severity_idx").on(table.runId, table.severity),
  index("warnings_run_status_idx").on(table.runId, table.status),
]);

export const agentLogs = sqliteTable("agent_logs", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => researchRuns.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  agentName: text("agent_name").notNull(),
  role: text("role").notNull(),
  phase: text("phase").notNull(),
  level: text("level", { enum: ["debug", "info", "warn", "error"] }).notNull(),
  message: text("message").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("agent_logs_run_sequence_uidx").on(table.runId, table.sequence),
  index("agent_logs_run_idx").on(table.runId),
  index("agent_logs_run_agent_idx").on(table.runId, table.agentName),
]);
