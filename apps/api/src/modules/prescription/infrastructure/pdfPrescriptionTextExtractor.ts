import { PrescriptionTextExtractorPort } from "../application/ports.js";

// The legacy (non-worker, no-DOM) Node build — pdf-parse's bundled pdf.js
// (v1.10.100, frozen since ~2017) throws hard on the malformed xref tables
// some real-world prescription PDFs have (e.g. exported from EHR systems,
// or PDF/A tools that write a slightly non-conformant xref section);
// pdfjs-dist's actively-maintained xref-recovery (rebuilds the xref table
// by scanning for objects when the table itself is broken) reads those
// same files without error.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

/** Real PDF text extraction — the only place in this module that touches the `pdfjs-dist` library, same "own your infrastructure" precedent as every other module's infrastructure/ folder. */
export class PdfPrescriptionTextExtractor implements PrescriptionTextExtractorPort {
  async extractText(fileBuffer: Buffer): Promise<string> {
    const doc = await pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
      // Recover from a broken xref table by rescanning the file for objects,
      // rather than failing outright with "bad XRef entry".
      stopAtErrors: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    try {
      let text = "";
      for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        text += (text ? "\n\n" : "") + pageText;
      }
      return text;
    } finally {
      await doc.destroy();
    }
  }
}
