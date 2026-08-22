import { REQUIRED_COVERAGE, type CoverageEntry, type CoverageReport, type CoverageRequirement } from "./types.ts";
import { freezeRecord, oneOf, textArray, throwIfInvalid, unique, type ValidationIssue } from "./validation.ts";

export interface CoverageInput {
  readonly requirement: CoverageRequirement;
  readonly sourceIds: readonly string[];
}

export function buildCoverageReport(inputs: readonly CoverageInput[]): CoverageReport {
  const issues: ValidationIssue[] = [];
  const sourceIdsByRequirement = new Map<CoverageRequirement, string[]>();

  inputs.forEach((input, index) => {
    const path = `entries[${index}]`;
    const requirementValid = oneOf(issues, `${path}.requirement`, input.requirement, REQUIRED_COVERAGE);
    const idsValid = textArray(issues, `${path}.sourceIds`, input.sourceIds);
    if (!requirementValid || !idsValid) return;
    const existing = sourceIdsByRequirement.get(input.requirement) ?? [];
    sourceIdsByRequirement.set(input.requirement, [...existing, ...input.sourceIds]);
  });
  throwIfInvalid(issues);

  const entries: readonly CoverageEntry[] = Object.freeze(REQUIRED_COVERAGE.map((requirement) => freezeRecord({
    requirement,
    sourceIds: unique(sourceIdsByRequirement.get(requirement) ?? []),
  })));
  const metRequirements = Object.freeze(entries.filter((entry) => entry.sourceIds.length > 0).map((entry) => entry.requirement));
  const missingRequirements = Object.freeze(entries.filter((entry) => entry.sourceIds.length === 0).map((entry) => entry.requirement));

  return freezeRecord({
    entries,
    metRequirements,
    missingRequirements,
    coverageRatio: metRequirements.length / REQUIRED_COVERAGE.length,
    complete: missingRequirements.length === 0,
  });
}
