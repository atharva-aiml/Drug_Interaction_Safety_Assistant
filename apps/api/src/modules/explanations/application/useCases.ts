import { RiskDetail } from "@disa/shared-types";
import {
  assertGroundedInPath,
  buildAllergyPath,
  buildContraindicationPath,
  buildInteractionPath,
  explainPath,
} from "../domain/riskPath.js";
import {
  AllergyLinkLookupPort,
  ContraindicationLookupPort,
  InteractionLookupPort,
  PatientLookupPort,
  RiskNotFoundError,
} from "./ports.js";

export interface GetRiskDetailDeps {
  interactions: InteractionLookupPort;
  allergyLinks: AllergyLinkLookupPort;
  contraindications: ContraindicationLookupPort;
  patients: PatientLookupPort;
}

/**
 * SD-005 Explanation Service. A risk id is just the underlying edge's own
 * id, and edge ids aren't namespaced by type, so this tries each risk-type
 * module in turn — first match wins. `patientId` is optional; when present
 * it adds the Patient node to every risk type's path — `TAKES` edges to both
 * interacting drugs, or the `HAS_ALLERGY`/`HAS_CONDITION` edge that completes
 * the allergy/contraindication reasoning — so the graph view (SCR-004) always
 * shows how the patient connects to the risk, not just the drug-to-drug/
 * allergen/disease relationship in isolation.
 */
export async function getRiskDetail(riskId: string, patientId: string | undefined, deps: GetRiskDetailDeps): Promise<RiskDetail> {
  const interaction = await deps.interactions.findById(riskId);
  if (interaction) {
    const patient = patientId ? await deps.patients.findById(patientId) : undefined;
    const path = buildInteractionPath(interaction, patient);
    const result = explainPath("interaction", path);
    assertGroundedInPath(result, path);
    return { id: riskId, type: "interaction", severity: interaction.severity, explanation: result.text, path };
  }

  const allergyLink = await deps.allergyLinks.findById(riskId);
  if (allergyLink) {
    const patient = patientId ? await deps.patients.findById(patientId) : undefined;
    const path = buildAllergyPath(allergyLink, patient);
    const result = explainPath("allergy", path);
    assertGroundedInPath(result, path);
    return { id: riskId, type: "allergy", severity: allergyLink.severity, explanation: result.text, path };
  }

  const contraindication = await deps.contraindications.findById(riskId);
  if (contraindication) {
    const patient = patientId ? await deps.patients.findById(patientId) : undefined;
    const path = buildContraindicationPath(contraindication, patient);
    const result = explainPath("contraindication", path);
    assertGroundedInPath(result, path);
    return { id: riskId, type: "contraindication", severity: contraindication.severity, explanation: result.text, path };
  }

  throw new RiskNotFoundError(riskId);
}
