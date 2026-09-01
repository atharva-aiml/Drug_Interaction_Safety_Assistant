import { buildPrescriptionMessage, NoMedicationsFoundError, normalizeMedicationNames } from "../domain/prescriptionMessage.js";
import {
  MedicationExtractorPort,
  PrescriptionParsingError,
  PrescriptionTextExtractorPort,
} from "./ports.js";

export interface ParsePrescriptionDeps {
  textExtractor: PrescriptionTextExtractorPort;
  medicationExtractor: MedicationExtractorPort;
}

export interface ParsedPrescription {
  medications: string[];
  /** The sentence to hand to the SAME chat pipeline (`POST /chat-sessions/:id/messages`) that free-text and the structured form already use — no separate risk-check path for this module. */
  message: string;
}

/**
 * Parses an uploaded prescription (PDF) into the medication names it lists.
 *
 * Deliberately does NOT call `checkRisks`/Cypher itself: the actual
 * interaction/allergy/contraindication risk check (and the Groq-composed,
 * grounded answer) happens exactly once in the codebase, in
 * `assistant`'s `runTurn` -> `risk-check`'s `checkRisks`. This use case's
 * only job is turning "here's a PDF" into "here's the same kind of sentence
 * a typed message would be", per the module's design note above.
 */
export async function parsePrescription(
  fileBuffer: Buffer,
  deps: ParsePrescriptionDeps
): Promise<ParsedPrescription> {
  let text: string;
  try {
    text = await deps.textExtractor.extractText(fileBuffer);
  } catch (err) {
    throw new PrescriptionParsingError(
      `Could not read the uploaded file as a PDF: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }

  if (!text.trim()) {
    throw new NoMedicationsFoundError();
  }

  let extracted: string[];
  try {
    extracted = await deps.medicationExtractor.extractMedications(text);
  } catch (err) {
    throw new PrescriptionParsingError(
      `Could not extract medications from the prescription: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }

  const medications = normalizeMedicationNames(extracted);
  if (medications.length === 0) {
    throw new NoMedicationsFoundError();
  }

  return { medications, message: buildPrescriptionMessage(medications) };
}
