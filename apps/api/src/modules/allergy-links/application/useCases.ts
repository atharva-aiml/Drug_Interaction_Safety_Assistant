import { AllergyLink, Risk, Severity } from "@disa/shared-types";
import { assertValidSeverity, toRisk } from "../domain/allergyLink.js";
import {
  AllergenCatalogPort,
  AllergenNotFoundError,
  AllergyLinkRepository,
  DrugCatalogPort,
  DrugNotFoundError,
} from "./ports.js";

export interface CreateAllergyLinkDeps {
  allergyLinks: AllergyLinkRepository;
  drugCatalog: DrugCatalogPort;
  allergenCatalog: AllergenCatalogPort;
  newId: () => string;
}

export async function createAllergyLink(
  drugId: string,
  allergenId: string,
  severity: unknown,
  deps: CreateAllergyLinkDeps
): Promise<AllergyLink> {
  assertValidSeverity(severity);

  const existingDrugs = await deps.drugCatalog.existingDrugIds([drugId]);
  if (!existingDrugs.has(drugId)) {
    throw new DrugNotFoundError([drugId]);
  }
  const existingAllergens = await deps.allergenCatalog.existingAllergenIds([allergenId]);
  if (!existingAllergens.has(allergenId)) {
    throw new AllergenNotFoundError([allergenId]);
  }

  return deps.allergyLinks.create(deps.newId(), drugId, allergenId, severity as Severity);
}

/** Used by the risk-check module (SD-004 orchestrator). */
export async function findAllergyRisks(
  drugIds: string[],
  allergenIds: string[],
  deps: { allergyLinks: AllergyLinkRepository }
): Promise<Risk[]> {
  if (drugIds.length === 0 || allergenIds.length === 0) return [];
  const found = await deps.allergyLinks.findConflicts(drugIds, allergenIds);
  return found.map(toRisk);
}
