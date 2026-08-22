export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export class DomainValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
    this.name = "DomainValidationError";
    this.issues = Object.freeze([...issues]);
  }
}

export function requiredText(issues: ValidationIssue[], path: string, value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, code: "required", message: "must be a non-empty string" });
    return false;
  }
  return true;
}

export function oneOf<T extends string>(issues: ValidationIssue[], path: string, value: unknown, allowed: readonly T[]): value is T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    issues.push({ path, code: "invalid_value", message: `must be one of: ${allowed.join(", ")}` });
    return false;
  }
  return true;
}

export function isoDate(issues: ValidationIssue[], path: string, value: unknown, nullable = false): value is string | null {
  if (nullable && value === null) return true;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    issues.push({ path, code: "invalid_date", message: "must be an ISO-8601 date string" });
    return false;
  }
  return true;
}

export function textArray(issues: ValidationIssue[], path: string, value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    issues.push({ path, code: "invalid_type", message: "must be an array" });
    return false;
  }
  const invalid = value.some((item) => typeof item !== "string" || item.trim().length === 0);
  if (invalid) {
    issues.push({ path, code: "invalid_item", message: "must contain only non-empty strings" });
    return false;
  }
  return true;
}

export function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values.map((value) => value.trim()))]);
}

export function throwIfInvalid(issues: ValidationIssue[]): void {
  if (issues.length > 0) throw new DomainValidationError(issues);
}

export function freezeRecord<T extends object>(record: T): Readonly<T> {
  return Object.freeze(record);
}
