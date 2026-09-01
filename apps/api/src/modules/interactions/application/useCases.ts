import { DrugInteraction, Risk, Severity } from "@disa/shared-types";
import {
  assertDistinctDrugs,
  assertOnlyInvolvesDrug,
  assertValidSeverity,
  dedupeSymmetricPairs,
  toRisk,
} from "../domain/interaction.js";
import { DrugCatalogPort, DrugNotFoundError, InteractionRepository } from "./ports.js";

export interface CreateInteractionDeps {
  interactions: InteractionRepository;
  catalog: DrugCatalogPort;
  newId: () => string;
}

export async function createInteraction(
  drugAId: string,
  drugBId: string,
  severity: unknown,
  deps: CreateInteractionDeps,
  riskDescription?: string,
  tip?: string
): Promise<DrugInteraction> {
  assertValidSeverity(severity);
  assertDistinctDrugs(drugAId, drugBId);

  const existing = await deps.catalog.existingDrugIds([drugAId, drugBId]);
  const missing = [drugAId, drugBId].filter((id) => !existing.has(id));
  if (missing.length > 0) {
    throw new DrugNotFoundError(missing);
  }

  return deps.interactions.create(deps.newId(), drugAId, drugBId, severity as Severity, riskDescription, tip);
}

/** Used by the risk-check module (SD-004 orchestrator) — not called directly by any route in this module. */
export async function findInteractionRisks(
  drugIds: string[],
  deps: { interactions: InteractionRepository }
): Promise<Risk[]> {
  if (drugIds.length < 2) return [];
  const found = await deps.interactions.findAmong(drugIds);
  return dedupeSymmetricPairs(found).map(toRisk);
}

/**
 * Used by the risk-check module for incremental recheck (REQ-016): only
 * checks the new drug against the patient's existing medications — never
 * recomputes pairs among the existing medications themselves.
 */
export async function findIncrementalInteractionRisks(
  newDrugId: string,
  existingDrugIds: string[],
  deps: { interactions: InteractionRepository }
): Promise<Risk[]> {
  if (existingDrugIds.length === 0) return [];
  const found = await deps.interactions.findInvolving(newDrugId, existingDrugIds);
  assertOnlyInvolvesDrug(found, newDrugId);
  return dedupeSymmetricPairs(found).map(toRisk);
}
