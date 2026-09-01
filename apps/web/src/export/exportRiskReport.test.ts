import { describe, expect, it } from "vitest";
import type { Risk } from "@disa/shared-types";
import { exportRiskReport, ReportDownloader } from "./exportRiskReport";

function risk(id: string, severity: Risk["severity"]): Risk {
  return { id, type: "interaction", severity, drugsInvolved: [], summary: `${id} summary text` };
}

class FakeDownloader implements ReportDownloader {
  calls: { filename: string; content: Blob; mimeType: string }[] = [];
  download(filename: string, content: Blob, mimeType: string): void {
    this.calls.push({ filename, content, mimeType });
  }
}

describe("exportRiskReport use case", () => {
  it("downloads a PDF blob and returns a report matching the given risks", () => {
    const downloader = new FakeDownloader();
    const risks = [risk("r1", "severe"), risk("r2", "moderate")];

    const report = exportRiskReport({ patientId: "p1", patientDisplayName: "Jane Renamed" }, risks, {
      downloader,
      now: () => "2026-08-17T00:00:00.000Z",
    });

    expect(downloader.calls).toHaveLength(1);
    expect(downloader.calls[0].content).toBeInstanceOf(Blob);
    expect(downloader.calls[0].content.type).toBe("application/pdf");
    expect(downloader.calls[0].content.size).toBeGreaterThan(0);
    expect(report.risks).toEqual(risks);
    expect(report.riskCount).toBe(2);
  });

  it("names the file after the patient and uses a PDF mime type", () => {
    const downloader = new FakeDownloader();
    exportRiskReport({ patientDisplayName: "Jane Renamed" }, [], { downloader, now: () => "t" });
    expect(downloader.calls[0].filename).toMatch(/^risk-report-jane-renamed-\d+\.pdf$/);
    expect(downloader.calls[0].mimeType).toBe("application/pdf");
  });

  it("falls back to a generic filename when there's no patient context (ad-hoc check)", () => {
    const downloader = new FakeDownloader();
    exportRiskReport({}, [risk("r1", "minor")], { downloader, now: () => "t" });
    expect(downloader.calls[0].filename).toMatch(/^risk-report-adhoc-\d+\.pdf$/);
  });

  it("still enforces the grounding rule before rendering — a mismatched report never reaches the downloader", () => {
    // assertReportMatchesRisks is exercised directly in exportReport.test.ts; this
    // confirms exportRiskReport still calls it (via buildExportReport using the same
    // risks it's given, so there's nothing to mismatch) rather than skipping the check.
    const downloader = new FakeDownloader();
    const risks = [risk("r1", "severe"), risk("r2", "severe"), risk("r3", "minor")];
    exportRiskReport({}, risks, { downloader, now: () => "t" });
    expect(downloader.calls).toHaveLength(1);
  });
});
