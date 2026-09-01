import { QueryResultSummary, Risk, SEVERITIES, SeverityTally } from "@disa/shared-types";

function zeroTally(): SeverityTally {
  return { minor: 0, moderate: 0, severe: 0, contraindicated: 0 };
}

function tally(risks: Risk[]): SeverityTally {
  const counts = zeroTally();
  for (const risk of risks) {
    counts[risk.severity] += 1;
  }
  return counts;
}

/** Pure — builds the logged summary directly from the real result, nothing invented. */
export function summarizeResult(risks: Risk[]): QueryResultSummary {
  return {
    status: "success",
    totalRisks: risks.length,
    bySeverity: tally(risks),
    risks,
  };
}

export function summarizeFailure(errorMessage: string): QueryResultSummary {
  return {
    status: "failed",
    totalRisks: 0,
    bySeverity: zeroTally(),
    errorMessage,
  };
}

export class SummaryMismatchError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Business rule (REQ-018 — "log each risk query... result"): a logged
 * result summary must be provably derived from the risks it claims to
 * summarize, not hand-authored. Recomputes the tally from `resultSummary.risks`
 * and compares it against the stored `bySeverity`/`totalRisks` rather than
 * trusting them — the same reference-checking pattern as the explanation
 * grounding rule in V0.5, applied here to the query log instead of prose.
 */
export function assertSummaryConsistent(summary: QueryResultSummary): void {
  if (summary.status === "failed") {
    if (summary.totalRisks !== 0 || Object.values(summary.bySeverity).some((n) => n !== 0)) {
      throw new SummaryMismatchError("A failed query's summary must report zero risks.");
    }
    if (!summary.errorMessage) {
      throw new SummaryMismatchError("A failed query's summary must include an errorMessage.");
    }
    return;
  }

  const risks = summary.risks ?? [];
  if (risks.length !== summary.totalRisks) {
    throw new SummaryMismatchError(
      `totalRisks (${summary.totalRisks}) does not match the number of risks actually stored (${risks.length}).`
    );
  }
  const recomputed = tally(risks);
  for (const severity of SEVERITIES) {
    if (recomputed[severity] !== summary.bySeverity[severity]) {
      throw new SummaryMismatchError(
        `bySeverity.${severity} (${summary.bySeverity[severity]}) does not match the recomputed count (${recomputed[severity]}).`
      );
    }
  }
}
