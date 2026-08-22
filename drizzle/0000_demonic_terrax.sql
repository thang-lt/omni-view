CREATE TABLE `agent_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`agent_name` text NOT NULL,
	`role` text NOT NULL,
	`phase` text NOT NULL,
	`level` text NOT NULL,
	`message` text NOT NULL,
	`metadata` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `research_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_logs_run_sequence_uidx` ON `agent_logs` (`run_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `agent_logs_run_idx` ON `agent_logs` (`run_id`);--> statement-breakpoint
CREATE INDEX `agent_logs_run_agent_idx` ON `agent_logs` (`run_id`,`agent_name`);--> statement-breakpoint
CREATE TABLE `claim_evidence` (
	`claim_id` text NOT NULL,
	`evidence_id` text NOT NULL,
	`relationship` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`claim_id`, `evidence_id`, `relationship`),
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `claim_evidence_claim_relationship_idx` ON `claim_evidence` (`claim_id`,`relationship`);--> statement-breakpoint
CREATE INDEX `claim_evidence_evidence_idx` ON `claim_evidence` (`evidence_id`);--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`text` text NOT NULL,
	`normalized_text` text NOT NULL,
	`type` text NOT NULL,
	`verdict` text NOT NULL,
	`confidence` text NOT NULL,
	`confidence_reason` text NOT NULL,
	`assumptions` text NOT NULL,
	`unresolved_questions` text NOT NULL,
	`is_material` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `research_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `claims_run_idx` ON `claims` (`run_id`);--> statement-breakpoint
CREATE INDEX `claims_run_verdict_idx` ON `claims` (`run_id`,`verdict`);--> statement-breakpoint
CREATE INDEX `claims_run_type_idx` ON `claims` (`run_id`,`type`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`source_id` text NOT NULL,
	`quote` text NOT NULL,
	`locator` text NOT NULL,
	`context_before` text NOT NULL,
	`context_after` text NOT NULL,
	`extracted_at` text NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `research_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `evidence_run_idx` ON `evidence` (`run_id`);--> statement-breakpoint
CREATE INDEX `evidence_source_idx` ON `evidence` (`source_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_source_hash_locator_uidx` ON `evidence` (`source_id`,`content_hash`,`locator`);--> statement-breakpoint
CREATE TABLE `evidence_families` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`canonical_key` text NOT NULL,
	`root_source_id` text,
	`label` text,
	`provenance_notes` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `research_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_families_run_key_uidx` ON `evidence_families` (`run_id`,`canonical_key`);--> statement-breakpoint
CREATE INDEX `evidence_families_run_idx` ON `evidence_families` (`run_id`);--> statement-breakpoint
CREATE INDEX `evidence_families_root_source_idx` ON `evidence_families` (`root_source_id`);--> statement-breakpoint
CREATE TABLE `research_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`topic` text NOT NULL,
	`status` text NOT NULL,
	`mode` text NOT NULL,
	`model` text,
	`prompt_version` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`scope` text NOT NULL,
	`report_markdown` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `research_runs_status_started_idx` ON `research_runs` (`status`,`started_at`);--> statement-breakpoint
CREATE INDEX `research_runs_completed_idx` ON `research_runs` (`completed_at`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`evidence_family_id` text,
	`canonical_url` text NOT NULL,
	`title` text NOT NULL,
	`publisher` text,
	`authors` text NOT NULL,
	`published_at` text,
	`accessed_at` text NOT NULL,
	`language` text,
	`source_type` text NOT NULL,
	`stakeholder_groups` text NOT NULL,
	`coverage_tags` text NOT NULL,
	`upstream_source_ids` text NOT NULL,
	`full_text_status` text NOT NULL,
	`ownership` text,
	`funding_notes` text NOT NULL,
	`content_hash` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `research_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evidence_family_id`) REFERENCES `evidence_families`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_run_canonical_url_uidx` ON `sources` (`run_id`,`canonical_url`);--> statement-breakpoint
CREATE INDEX `sources_run_idx` ON `sources` (`run_id`);--> statement-breakpoint
CREATE INDEX `sources_family_idx` ON `sources` (`evidence_family_id`);--> statement-breakpoint
CREATE INDEX `sources_run_type_idx` ON `sources` (`run_id`,`source_type`);--> statement-breakpoint
CREATE INDEX `sources_publisher_idx` ON `sources` (`publisher`);--> statement-breakpoint
CREATE INDEX `sources_published_idx` ON `sources` (`published_at`);--> statement-breakpoint
CREATE TABLE `warnings` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`category` text NOT NULL,
	`observable_indicator` text NOT NULL,
	`evidence_ids` text NOT NULL,
	`alternative_explanation` text,
	`severity` text NOT NULL,
	`confidence` text NOT NULL,
	`confidence_reason` text NOT NULL,
	`verification_hint` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `research_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `warnings_run_idx` ON `warnings` (`run_id`);--> statement-breakpoint
CREATE INDEX `warnings_target_idx` ON `warnings` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `warnings_run_severity_idx` ON `warnings` (`run_id`,`severity`);--> statement-breakpoint
CREATE INDEX `warnings_run_status_idx` ON `warnings` (`run_id`,`status`);