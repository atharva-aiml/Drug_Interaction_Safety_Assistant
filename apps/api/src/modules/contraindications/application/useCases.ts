import { ContraindicationLink, Risk, Severity } from "@disa/shared-types";
import { assertValidSeverity, toRisk } from "../domain/contraindicationLink.js";
import {
  ContraindicationRepository,
  DiseaseCatalogPort,
  DiseaseNotFoundError,
  DrugCatalogPort,
  DrugNotFoundError,
} from "./ports.js";

export interface CreateContraindicationDeps {
  contraindications: ContraindicationRepository;
  drugCatalog: DrugCatalogPort;
  diseaseCatalog: DiseaseCatalogPort;
  newId: () => string;
}

export async function createContraindication(
  drugId: string,
  diseaseId: string,
  severity: unknown,
  deps: CreateContraindicationDeps
): Promise<ContraindicationLink> {
  assertValidSeverity(severity);

  const existingDrugs = await deps.drugCatalog.existingDrugIds([drugId]);
  if (!existingDrugs.has(drugId)) {
    throw new DrugNotFoundError([drugId]);
  }
  const existingDiseases = await deps.diseaseCatalog.existingDiseaseIds([diseaseId]);
  if (!existingDiseases.has(diseaseId)) {
    throw new DiseaseNotFoundError([diseaseId]);
  }

  return deps.contraindications.create(deps.newId(), drugId, diseaseId, severity as Severity);
}

/** Used by the risk-check module (SD-004 orchestrator). */
export async function findContraindicationRisks(
  drugIds: string[],
  diseaseIds: string[],
  deps: { contraindications: ContraindicationRepository }
): Promise<Risk[]> {
  if (drugIds.length === 0 || diseaseIds.length === 0) return [];
  const found = await deps.contraindications.findConflicts(drugIds, diseaseIds);
  return found.map(toRisk);
}
