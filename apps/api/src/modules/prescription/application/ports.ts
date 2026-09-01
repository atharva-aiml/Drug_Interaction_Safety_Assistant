/**
 * Ports for the prescription-upload feature. Kept deliberately narrow: the
 * use case only ever needs "give me the raw text of this file" and "give me
 * the medication names mentioned in this text" — everything downstream of
 * that (catalog resolution, real Cypher risk checks, LLM-composed answer)
 * is the SAME `assistant`/`chat-sessions` pipeline every other input already
 * goes through, reached by handing the built sentence to that pipeline, not
 * by re-implementing it here.
 */

/** Extracts raw text from an uploaded prescription file. Implemented by a PDF-parsing adapter in infrastructure/. */
export interface PrescriptionTextExtractorPort {
  extractText(fileBuffer: Buffer): Promise<string>;
}

/** Calls the LLM (Groq) to pull medication names out of prescription text. Implemented in infrastructure/ — the only place in this module allowed to talk to an LLM. */
export interface MedicationExtractorPort {
  extractMedications(text: string): Promise<string[]>;
}

export class PrescriptionParsingError extends Error {}
