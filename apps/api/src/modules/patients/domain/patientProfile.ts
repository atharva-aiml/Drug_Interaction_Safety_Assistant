import { Patient, PatientProfileFields } from "@disa/shared-types";

export class ProfileValidationError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export class AlreadyDeletedError extends Error {
  constructor(id: string) {
    super(`Patient ${id} is already deleted.`);
  }
}

/**
 * Business rule (REQ-027): deletion is a one-way state transition — deleting
 * an already-deleted patient is a conflict, not a silent no-op, so a caller
 * can't accidentally re-trigger delete-side-effects twice.
 */
export function assertNotAlreadyDeleted(patient: Patient): void {
  if (patient.deletedAt) {
    throw new AlreadyDeletedError(patient.id);
  }
}

function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

/**
 * Normalizes raw profile input: trims the display name, rejects a blank one,
 * and de-duplicates each reference list. Pure — no I/O, no knowledge of what
 * actually exists in the graph.
 */
export function normalizeProfileInput(input: PatientProfileFields): PatientProfileFields {
  if (!input.displayName || !input.displayName.trim()) {
    throw new ProfileValidationError("DISPLAY_NAME_REQUIRED", "Patient display name is required.");
  }
  return {
    displayName: input.displayName.trim(),
    medicationIds: dedupe(input.medicationIds ?? []),
    allergyIds: dedupe(input.allergyIds ?? []),
    conditionIds: dedupe(input.conditionIds ?? []),
  };
}

export interface ExistingReferenceSets {
  drugIds: Set<string>;
  allergenIds: Set<string>;
  conditionIds: Set<string>;
}

/**
 * Business rule (Requirements §3 / System Architecture §3): a patient profile
 * cannot reference a drug, allergen, or condition that doesn't already exist
 * as a node in the graph. Pure — takes the set of IDs that are already known
 * to exist and checks against it; doesn't query anything itself.
 */
export function assertReferencesExist(input: PatientProfileFields, existing: ExistingReferenceSets): void {
  const missingDrugs = input.medicationIds.filter((id) => !existing.drugIds.has(id));
  if (missingDrugs.length > 0) {
    throw new ProfileValidationError(
      "DRUG_NOT_FOUND",
      `Unknown medication id(s): ${missingDrugs.join(", ")}`,
      { missingDrugs }
    );
  }

  const missingAllergens = input.allergyIds.filter((id) => !existing.allergenIds.has(id));
  if (missingAllergens.length > 0) {
    throw new ProfileValidationError(
      "ALLERGEN_NOT_FOUND",
      `Unknown allergen id(s): ${missingAllergens.join(", ")}`,
      { missingAllergens }
    );
  }

  const missingConditions = input.conditionIds.filter((id) => !existing.conditionIds.has(id));
  if (missingConditions.length > 0) {
    throw new ProfileValidationError(
      "CONDITION_NOT_FOUND",
      `Unknown condition id(s): ${missingConditions.join(", ")}`,
      { missingConditions }
    );
  }
}
