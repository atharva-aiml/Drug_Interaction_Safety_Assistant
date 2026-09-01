/**
 * Feature: digital prescription upload (PDF). Turns the medication names
 * extracted from the uploaded prescription into the same kind of
 * natural-language sentence `buildStructuredMessage` builds for the
 * structured form (`apps/web/src/chat/buildStructuredMessage.ts`), so the
 * prescription path feeds the EXACT SAME backend pipeline (entity
 * extraction -> catalog resolution -> grounded risk check via real Cypher ->
 * composed answer) as free-text chat and the structured form — no separate
 * risk-evaluation logic duplicated here. Pure and deterministic so it can be
 * unit-tested alone, same precedent as the web-side domain layer.
 */

/** Trims, drops empties, and case-insensitively dedupes while keeping first-seen casing. */
export function normalizeMedicationNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const trimmed = (raw ?? "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/** Joins names into an English list: "a", "a and b", "a, b and c". */
function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Builds the sentence sent into the chat pipeline on the caller's behalf —
 * mirrors the web `buildStructuredMessage`'s "I am taking ..." phrasing so
 * the assistant's entity extractor sees an identically-shaped statement
 * regardless of which input path produced it.
 */
export function buildPrescriptionMessage(medicationNames: string[]): string {
  const names = normalizeMedicationNames(medicationNames);
  if (names.length === 0) return "";
  return `I am taking ${joinNames(names)}, according to my uploaded prescription.`;
}

export class NoMedicationsFoundError extends Error {
  constructor() {
    super("No medications could be identified in the uploaded prescription.");
  }
}
