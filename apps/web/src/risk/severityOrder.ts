import type { Risk, Severity } from "@disa/shared-types";

/**
 * Business rule (REQ-015): severity is an ordered scale, not just four
 * unordered labels — Design System §1 lists it low-to-high (minor →
 * contraindicated). Pure, no I/O.
 */
export const SEVERITY_ORDER: Record<Severity, number> = {
  minor: 0,
  moderate: 1,
  severe: 2,
  contraindicated: 3,
};

export function compareSeverityDesc(a: Severity, b: Severity): number {
  return SEVERITY_ORDER[b] - SEVERITY_ORDER[a];
}

export function meetsSeverityThreshold(severity: Severity, threshold: Severity): boolean {
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[threshold];
}

export type SeverityFilter = Severity | "all";

/** Keeps risks at or above the threshold — "Severe" hides lower severities, not higher ones. */
export function filterBySeverity<T extends Pick<Risk, "severity">>(risks: T[], threshold: SeverityFilter): T[] {
  if (threshold === "all") return risks;
  return risks.filter((r) => meetsSeverityThreshold(r.severity, threshold));
}

/** Most severe first — the safety-appropriate default ordering for a clinician scanning the list. */
export function sortBySeverityDesc<T extends Pick<Risk, "severity">>(risks: T[]): T[] {
  return [...risks].sort((a, b) => compareSeverityDesc(a.severity, b.severity));
}
