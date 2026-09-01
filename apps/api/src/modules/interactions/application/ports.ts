import { DrugInteraction, Severity } from "@disa/shared-types";

/** Repository port for the INTERACTS_WITH aggregate — real impl in infrastructure/, faked in tests. */
export interface InteractionRepository {
  create(id: string, drugAId: string, drugBId: string, severity: Severity, riskDescription?: string, tip?: string): Promise<DrugInteraction>;
  /** All interactions where both endpoints are within the given drug id set. */
  findAmong(drugIds: string[]): Promise<DrugInteraction[]>;
  /** A single interaction by its own edge id — used by the explanations module (SD-005). */
  findById(id: string): Promise<DrugInteraction | undefined>;
  /**
   * All interactions where one endpoint is exactly `drugId` and the other is
   * in `otherDrugIds` — the incremental-recheck query shape (REQ-016): never
   * touches pairs among `otherDrugIds` themselves.
   */
  findInvolving(drugId: string, otherDrugIds: string[]): Promise<DrugInteraction[]>;
}

/** Read-only lookup this module needs but doesn't own. */
export interface DrugCatalogPort {
  existingDrugIds(ids: string[]): Promise<Set<string>>;

  findByNames(
    names: string[]
  ): Promise<Array<{ id: string; name: string }>>;
}

export class DrugNotFoundError extends Error {
  constructor(public missingDrugIds: string[]) {
    super(`Unknown drug id(s): ${missingDrugIds.join(", ")}`);
  }
}
