/**
 * Feature: structured form input. Turns the three form fields into the same
 * kind of natural-language sentence a user would type, so the form path
 * feeds the EXACT SAME backend pipeline (entity extraction → catalog
 * resolution → grounded risk check) as free-text — no separate endpoint,
 * no separate logic. Pure and deterministic so it can be unit-tested alone.
 */

export interface StructuredInput {
  medications: string[];
  conditions: string[];
  allergies: string[];
}

/** Splits a comma/newline-separated field into trimmed, non-empty names. */
export function parseList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Joins names into an English list: "a", "a and b", "a, b and c". */
function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** True when at least one field has a usable value. */
export function hasAnyInput(input: StructuredInput): boolean {
  return input.medications.length > 0 || input.conditions.length > 0 || input.allergies.length > 0;
}

export function buildStructuredMessage(input: StructuredInput): string {
  const parts: string[] = [];
  if (input.medications.length > 0) parts.push(`I am taking ${joinNames(input.medications)}.`);
  if (input.conditions.length > 0) parts.push(`I have ${joinNames(input.conditions)}.`);
  if (input.allergies.length > 0) parts.push(`I am allergic to ${joinNames(input.allergies)}.`);
  return parts.join(" ");
}
