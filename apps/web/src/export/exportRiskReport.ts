import type { Risk } from "@disa/shared-types";
import { assertReportMatchesRisks, buildExportReport, ExportReport, ExportReportContext } from "./exportReport";
import { renderReportPdf } from "./pdfRenderer";

/**
 * Port: wherever the finished report actually goes. The real implementation
 * (browserDownloader.ts) triggers a real browser file download — this is
 * the "repository" for this slice, since there's no new backend persistence
 * to wrap; the risks being exported are already real data from the already-
 * real GET /risk-check endpoint. `content` is a Blob (the rendered PDF) rather
 * than a string, since a PDF is binary.
 */
export interface ReportDownloader {
  download(filename: string, content: Blob, mimeType: string): void;
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "adhoc";
}

export function exportRiskReport(
  context: ExportReportContext,
  risks: Risk[],
  deps: { downloader: ReportDownloader; now: () => string }
): ExportReport {
  const report = buildExportReport(context, risks, deps.now());
  assertReportMatchesRisks(report, risks);

  const filename = `risk-report-${slugify(context.patientDisplayName ?? "adhoc")}-${Date.now()}.pdf`;
  deps.downloader.download(filename, renderReportPdf(report), "application/pdf");

  return report;
}
