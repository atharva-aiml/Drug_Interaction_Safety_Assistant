import express, { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { NoMedicationsFoundError } from "./domain/prescriptionMessage.js";
import { PrescriptionParsingError } from "./application/ports.js";
import { parsePrescription } from "./application/useCases.js";
import { PdfPrescriptionTextExtractor } from "./infrastructure/pdfPrescriptionTextExtractor.js";
import { GroqMedicationExtractor } from "./infrastructure/groqMedicationExtractor.js";

const textExtractor = new PdfPrescriptionTextExtractor();
const medicationExtractor = new GroqMedicationExtractor();

// PDF only, per the feature's scope — mirrors data-import's memory-storage +
// size-limit precedent (dataImport.routes.ts) rather than a new upload convention.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new PrescriptionParsingError("Only PDF files are supported for prescription upload."));
      return;
    }
    cb(null, true);
  },
});

export const prescriptionRouter = Router();
prescriptionRouter.use(requireAuth);

/**
 * POST /prescription/parse
 *
 * Extracts medication names from an uploaded PDF prescription and returns
 * them alongside a ready-to-send chat message (SD-009 phrasing). Does NOT
 * itself run the risk check — the caller (web) hands the returned
 * `message` to the existing `POST /chat-sessions/:id/messages` pipeline,
 * which is the one place `runTurn`/`checkRisks` (real Cypher via Neo4j) and
 * Groq answer composition actually happen, exactly as it does for typed
 * text and the structured form.
 */
prescriptionRouter.post(
  "/parse",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "A PDF file is required (field name: file)." },
      });
    }

    try {
      const result = await parsePrescription(req.file.buffer, { textExtractor, medicationExtractor });
      return res.status(200).json(result);
    } catch (err) {
      if (err instanceof NoMedicationsFoundError) {
        return res.status(422).json({ error: { code: "NO_MEDICATIONS_FOUND", message: err.message } });
      }
      if (err instanceof PrescriptionParsingError) {
        return res.status(400).json({ error: { code: "PRESCRIPTION_PARSING_FAILED", message: err.message } });
      }
      throw err;
    }
  })
);

// multer's fileFilter error (wrong mime type) reaches this as a plain thrown
// error before the route body runs — surfaced here as a normal 400 instead
// of falling through to the generic 500 handler in app.ts.
prescriptionRouter.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof PrescriptionParsingError) {
    return res.status(400).json({ error: { code: "PRESCRIPTION_PARSING_FAILED", message: err.message } });
  }
  next(err);
});
