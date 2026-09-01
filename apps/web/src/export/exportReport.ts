import type { Risk, Severity, SeverityTally } from "@disa/shared-types";

export interface ExportReportContext {
  patientId?: string;
  patientDisplayName?: string;
  medicationCount?: number;
}

export interface ExportReport {
  generatedAt: string;
  query: ExportReportContext;
  riskCount: number;
  bySeverity: SeverityTally;
  risks: Risk[];
}

function tally(risks: Risk[]): SeverityTally {
  const counts: SeverityTally = { minor: 0, moderate: 0, severe: 0, contraindicated: 0 };
  for (const risk of risks) counts[risk.severity] += 1;
  return counts;
}

/** Pure — builds the report directly from the risks actually on screen, nothing invented. */
export function buildExportReport(context: ExportReportContext, risks: Risk[], generatedAt: string): ExportReport {
  return {
    generatedAt,
    query: context,
    riskCount: risks.length,
    bySeverity: tally(risks),
    risks,
  };
}

export class ExportMismatchError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Business rule (Build Plan V0.11 — "a downloaded report... contains the
 * same risks currently on screen"): the exported report's risks must be
 * exactly the risks it claims to represent — same set, same severity tally
 * — not a stale or partial copy. Recomputes and compares rather than
 * trusting the report object, same reference-checking pattern as V0.9's
 * query-log summary and V0.5's explanation grounding.
 */
export function assertReportMatchesRisks(report: ExportReport, risks: Risk[]): void {
  if (report.risks.length !== risks.length) {
    throw new ExportMismatchError(
      `Report contains ${report.risks.length} risk(s) but the screen shows ${risks.length}.`
    );
  }
  const onScreenIds = new Set(risks.map((r) => r.id));
  const missing = report.risks.filter((r) => !onScreenIds.has(r.id)).map((r) => r.id);
  if (missing.length > 0) {
    throw new ExportMismatchError(`Report contains risk id(s) not on screen: ${missing.join(", ")}`);
  }

  const recomputed = tally(risks);
  for (const severity of Object.keys(recomputed) as Severity[]) {
    if (recomputed[severity] !== report.bySeverity[severity]) {
      throw new ExportMismatchError(
        `bySeverity.${severity} (${report.bySeverity[severity]}) does not match the on-screen count (${recomputed[severity]}).`
      );
    }
  }
}
