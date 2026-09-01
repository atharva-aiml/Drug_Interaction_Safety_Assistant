import { describe, expect, it } from "vitest";
import { QueryResultSummary, Risk } from "@disa/shared-types";
import { assertSummaryConsistent, summarizeFailure, summarizeResult, SummaryMismatchError } from "./queryLog.js";

function risk(id: string, severity: Risk["severity"]): Risk {
  return { id, type: "interaction", severity, drugsInvolved: [], summary: id };
}

describe("summarizeResult", () => {
  it("tallies risks by severity and records the total", () => {
    const risks = [risk("r1", "severe"), risk("r2", "moderate"), risk("r3", "severe")];
    const summary = summarizeResult(risks);
    expect(summary.status).toBe("success");
    expect(summary.totalRisks).toBe(3);
    expect(summary.bySeverity).toEqual({ minor: 0, moderate: 1, severe: 2, contraindicated: 0 });
    expect(summary.risks).toBe(risks);
  });

  it("handles an empty result", () => {
    const summary = summarizeResult([]);
    expect(summary.totalRisks).toBe(0);
    expect(summary.bySeverity).toEqual({ minor: 0, moderate: 0, severe: 0, contraindicated: 0 });
  });
});

describe("summarizeFailure", () => {
  it("records zero risks and the error message", () => {
    const summary = summarizeFailure("No patient with id patient-999");
    expect(summary.status).toBe("failed");
    expect(summary.totalRisks).toBe(0);
    expect(summary.errorMessage).toBe("No patient with id patient-999");
  });
});

describe("assertSummaryConsistent — the actual business rule enforcement", () => {
  it("does not throw for a real summarizeResult output", () => {
    const summary = summarizeResult([risk("r1", "severe"), risk("r2", "minor")]);
    expect(() => assertSummaryConsistent(summary)).not.toThrow();
  });

  it("does not throw for a real summarizeFailure output", () => {
    const summary = summarizeFailure("boom");
    expect(() => assertSummaryConsistent(summary)).not.toThrow();
  });

  it("catches totalRisks not matching the actual stored risks — the regression this rule exists to prevent", () => {
    const summary = summarizeResult([risk("r1", "severe")]);
    const fabricated: QueryResultSummary = { ...summary, totalRisks: 5 };
    expect(() => assertSummaryConsistent(fabricated)).toThrow(SummaryMismatchError);
  });

  it("catches a bySeverity count that doesn't match the actual risks", () => {
    const summary = summarizeResult([risk("r1", "severe"), risk("r2", "severe")]);
    const fabricated: QueryResultSummary = { ...summary, bySeverity: { ...summary.bySeverity, severe: 1 } };
    expect(() => assertSummaryConsistent(fabricated)).toThrow(SummaryMismatchError);
  });

  it("rejects a 'failed' summary that claims nonzero risks", () => {
    const fabricated: QueryResultSummary = {
      status: "failed",
      totalRisks: 2,
      bySeverity: { minor: 0, moderate: 0, severe: 2, contraindicated: 0 },
      errorMessage: "boom",
    };
    expect(() => assertSummaryConsistent(fabricated)).toThrow(SummaryMismatchError);
  });

  it("rejects a 'failed' summary with no errorMessage", () => {
    const fabricated: QueryResultSummary = {
      status: "failed",
      totalRisks: 0,
      bySeverity: { minor: 0, moderate: 0, severe: 0, contraindicated: 0 },
    };
    expect(() => assertSummaryConsistent(fabricated)).toThrow(SummaryMismatchError);
  });
});
