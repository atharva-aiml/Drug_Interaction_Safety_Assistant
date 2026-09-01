import { AllergyLink, Severity } from "@disa/shared-types";

export interface AllergyLinkRepository {
  create(id: string, drugId: string, allergenId: string, severity: Severity): Promise<AllergyLink>;
  /** All CONTAINS_ALLERGEN links where the drug is in drugIds and the allergen is in allergenIds. */
  findConflicts(drugIds: string[], allergenIds: string[]): Promise<AllergyLink[]>;
  /** A single link by its own edge id — used by the explanations module (SD-005). */
  findById(id: string): Promise<AllergyLink | undefined>;
}

export interface DrugCatalogPort {
  existingDrugIds(ids: string[]): Promise<Set<string>>;
}

export interface AllergenCatalogPort {
  existingAllergenIds(ids: string[]): Promise<Set<string>>;
}

export class DrugNotFoundError extends Error {
  constructor(public missingDrugIds: string[]) {
    super(`Unknown drug id(s): ${missingDrugIds.join(", ")}`);
  }
}

export class AllergenNotFoundError extends Error {
  constructor(public missingAllergenIds: string[]) {
    super(`Unknown allergen id(s): ${missingAllergenIds.join(", ")}`);
  }
}
