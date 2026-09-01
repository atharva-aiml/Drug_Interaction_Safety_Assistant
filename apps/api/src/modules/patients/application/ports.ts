import { Patient, PatientProfileFields, PatientSummary } from "@disa/shared-types";

/** Repository port (Patient aggregate) — implemented for real by Neo4j, faked in tests. */
export interface PatientRepository {
  create(id: string, profile: PatientProfileFields, createdAt: string): Promise<Patient>;
  findById(id: string): Promise<Patient | undefined>;
  list(): Promise<PatientSummary[]>;
  update(id: string, profile: PatientProfileFields): Promise<Patient>;
  softDelete(id: string, deletedAt: string): Promise<Patient>;
  listDeleted(): Promise<PatientSummary[]>;
}

/**
 * Port for checking which referenced drug/allergen/condition ids actually
 * exist. Separate from PatientRepository because it reads a different part
 * of the graph (reference-data nodes, not the Patient aggregate itself).
 */
export interface ReferenceCatalogPort {
  existingDrugIds(ids: string[]): Promise<Set<string>>;
  existingAllergenIds(ids: string[]): Promise<Set<string>>;
  existingConditionIds(ids: string[]): Promise<Set<string>>;
}

export class PatientNotFoundError extends Error {
  constructor(id: string) {
    super(`No patient with id ${id}`);
  }
}
