import { ContraindicationLink, Severity } from "@disa/shared-types";

export interface ContraindicationRepository {
  create(id: string, drugId: string, diseaseId: string, severity: Severity): Promise<ContraindicationLink>;
  /** All CONTRAINDICATED_FOR links where the drug is in drugIds and the disease is in diseaseIds. */
  findConflicts(drugIds: string[], diseaseIds: string[]): Promise<ContraindicationLink[]>;
  /** A single link by its own edge id — used by the explanations module (SD-005). */
  findById(id: string): Promise<ContraindicationLink | undefined>;
}

export interface DrugCatalogPort {
  existingDrugIds(ids: string[]): Promise<Set<string>>;
}

export interface DiseaseCatalogPort {
  existingDiseaseIds(ids: string[]): Promise<Set<string>>;
}

export class DrugNotFoundError extends Error {
  constructor(public missingDrugIds: string[]) {
    super(`Unknown drug id(s): ${missingDrugIds.join(", ")}`);
  }
}

export class DiseaseNotFoundError extends Error {
  constructor(public missingDiseaseIds: string[]) {
    super(`Unknown disease id(s): ${missingDiseaseIds.join(", ")}`);
  }
}
