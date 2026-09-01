import { jsPDF } from "jspdf";
import type { Severity } from "@disa/shared-types";
import type { ExportReport } from "./exportReport";

// Hex values mirror styles.css's severity/text tokens — jsPDF draws to a PDF
// canvas, not the DOM, so it can't read CSS custom properties (same reason
// GraphView.tsx keeps its own hand-synced hex copies for Cytoscape).
const TEXT_PRIMARY = "#141C26";
const TEXT_SECONDARY = "#526070";
const ACTION_DEFAULT = "#2C5AA0";
const SEVERITY_COLOR: Record<Severity, string> = {
  minor: "#B45309",
  moderate: "#C2410C",
  severe: "#DC2626",
  contraindicated: "#7F1D1D",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  minor: "MINOR",
  moderate: "MODERATE",
  severe: "SEVERE",
  contraindicated: "CONTRAINDICATED",
};

const PAGE_MARGIN = 56;
const PAGE_WIDTH = 612; // US Letter, points
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function summarySentence(report: ExportReport): string {
  if (report.riskCount === 0) {
    return "No risks were found for this medication list.";
  }
  const parts = (Object.entries(report.bySeverity) as [Severity, number][])
    .filter(([, count]) => count > 0)
    .map(([severity, count]) => `${count} ${severity}`);
  return `${report.riskCount} risk${report.riskCount === 1 ? "" : "s"} found: ${parts.join(", ")}.`;
}

/**
 * Renders the already-built, already-grounded ExportReport (buildExportReport +
 * assertReportMatchesRisks in exportReport.ts, both unchanged) as a natural-language
 * PDF — one paragraph per risk, severity called out in its own color, not a JSON dump.
 */
export function renderReportPdf(report: ExportReport): Blob {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = PAGE_MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(ACTION_DEFAULT);
  doc.text("Drug Interaction Risk Report", PAGE_MARGIN, y);
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(TEXT_SECONDARY);
  const context = report.query.patientDisplayName
    ? `Patient: ${report.query.patientDisplayName}`
    : "Ad-hoc medication list";
  doc.text(context, PAGE_MARGIN, y);
  y += 14;
  doc.text(`Generated ${new Date(report.generatedAt).toLocaleString()}`, PAGE_MARGIN, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(TEXT_PRIMARY);
  const summaryLines = doc.splitTextToSize(summarySentence(report), CONTENT_WIDTH);
  doc.text(summaryLines, PAGE_MARGIN, y);
  y += summaryLines.length * 15 + 12;

  if (report.riskCount > 0) {
    doc.setDrawColor(221, 227, 234); // --color-border-default
    doc.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);
    y += 20;
  }

  for (const risk of report.risks) {
    if (y > PAGE_HEIGHT - PAGE_MARGIN - 40) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(SEVERITY_COLOR[risk.severity]);
    const severityTag = `${SEVERITY_LABEL[risk.severity]} — ${risk.type.toUpperCase()}`;
    doc.text(severityTag, PAGE_MARGIN, y);
    y += 15;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(TEXT_PRIMARY);
    const bodyLines = doc.splitTextToSize(risk.summary, CONTENT_WIDTH);
    doc.text(bodyLines, PAGE_MARGIN, y);
    y += bodyLines.length * 14 + 16;
  }

  return doc.output("blob");
}
