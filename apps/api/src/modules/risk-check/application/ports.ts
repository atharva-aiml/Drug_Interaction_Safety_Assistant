export interface PatientProfile {
  medicationIds: string[];
  allergyIds: string[];
  conditionIds: string[];
}

export interface PatientProfileLookupPort {
  /** undefined if the patient id doesn't exist. */
  getProfile(patientId: string): Promise<PatientProfile | undefined>;
}

/**
 * Read-only reference lookup used by the risk-check engine.
 *
 * The structured form sends human-readable names such as:
 *
 *   aspirin
 *   warfarin
 *   hypertension
 *
 * The risk engine itself works with Neo4j IDs, so the names must be
 * resolved before the risk queries are executed.
 */
export interface RiskReferenceCatalogPort {
  findDrugsByNames(
    names: string[]
  ): Promise<Array<{ id: string; name: string }>>;

  findAllergensByNames(
    names: string[]
  ): Promise<Array<{ id: string; name: string }>>;

  findDiseasesByNames(
    names: string[]
  ): Promise<Array<{ id: string; name: string }>>;
}

export class PatientNotFoundError extends Error {
  constructor(patientId: string) {
    super(`No patient with id ${patientId}`);
  }
}

export class RiskReferenceNotFoundError extends Error {
  constructor(
    public kind: "medication" | "allergy" | "condition",
    public names: string[]
  ) {
    super(
      `Unknown ${kind}(s): ${names.join(", ")}`
    );
  }
}