import { describe, expect, it } from "vitest";
import type { Risk } from "@disa/shared-types";
import { assertReportMatchesRisks, buildExportReport, ExportMismatchError } from "./exportReport";

function risk(id: string, severity: Risk["severity"]): Risk {
  return { id, type: "interaction", severity, drugsInvolved: [{ id: "d1", name: "Warfarin" }], summary: id };
}

describe("buildExportReport", () => {
  it("builds a report directly from the given risks and context", () => {
    const risks = [risk("r1", "severe"), risk("r2", "moderate")];
    const report = buildExportReport({ patientId: "p1", patientDisplayName: "Jane" }, risks, "2026-08-17T00:00:00.000Z");
    expect(report.riskCount).toBe(2);
    expect(report.bySeverity).toEqual({ minor: 0, moderate: 1, severe: 1, contraindicated: 0 });
    expect(report.risks).toBe(risks);
    expect(report.query.patientDisplayName).toBe("Jane");
  });

  it("handles an empty risk list", () => {
    const report = buildExportReport({}, [], "t");
    expect(report.riskCount).toBe(0);
    expect(report.bySeverity).toEqual({ minor: 0, moderate: 0, severe: 0, contraindicated: 0 });
  });
});

describe("assertReportMatchesRisks — the actual business rule enforcement", () => {
  it("does not throw for a real buildExportReport output", () => {
    const risks = [risk("r1", "severe"), risk("r2", "contraindicated")];
    const report = buildExportReport({}, risks, "t");
    expect(() => assertReportMatchesRisks(report, risks)).not.toThrow();
  });

  it("catches a report with fewer risks than what's on screen", () => {
    const onScreen = [risk("r1", "severe"), risk("r2", "moderate")];
    const staleReport = buildExportReport({}, [risk("r1", "severe")], "t");
    expect(() => assertReportMatchesRisks(staleReport, onScreen)).toThrow(ExportMismatchError);
  });

  it("catches a report containing a risk id not on screen — the regression this rule exists to prevent", () => {
    const onScreen = [risk("r1", "severe")];
    const fabricatedReport = buildExportReport({}, [risk("r1", "severe"), risk("phantom", "minor")], "t");
    expect(() => assertReportMatchesRisks(fabricatedReport, onScreen)).toThrow(ExportMismatchError);
  });

  it("catches a bySeverity tally that doesn't match the actual on-screen risks", () => {
    const onScreen = [risk("r1", "severe"), risk("r2", "severe")];
    const report = buildExportReport({}, onScreen, "t");
    const corrupted = { ...report, bySeverity: { ...report.bySeverity, severe: 1 } };
    expect(() => assertReportMatchesRisks(corrupted, onScreen)).toThrow(ExportMismatchError);
  });
});
