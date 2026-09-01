import {
  Risk,
  RiskCheckRequest,
} from "@disa/shared-types";

import {
  AllergyLinkRepository,
} from "../../allergy-links/application/ports.js";

import {
  findAllergyRisks,
} from "../../allergy-links/application/useCases.js";

import {
  ContraindicationRepository,
} from "../../contraindications/application/ports.js";

import {
  findContraindicationRisks,
} from "../../contraindications/application/useCases.js";

import {
  InteractionRepository,
} from "../../interactions/application/ports.js";

import {
  findIncrementalInteractionRisks,
  findInteractionRisks,
} from "../../interactions/application/useCases.js";

import {
  PatientNotFoundError,
  PatientProfile,
  PatientProfileLookupPort,
  RiskReferenceCatalogPort,
  RiskReferenceNotFoundError,
} from "./ports.js";

export interface RiskCheckDeps {
  interactions: InteractionRepository;
  allergyLinks: AllergyLinkRepository;
  contraindications: ContraindicationRepository;
  patientProfile: PatientProfileLookupPort;

  /**
   * Resolves human-readable names from the structured form into
   * the actual Neo4j node IDs used by the risk engine.
   */
  references: RiskReferenceCatalogPort;
}

/**
 * SD-004 Risk Query Engine.
 *
 * The engine always executes the actual risk checks using Neo4j IDs.
 *
 * For a stored patient profile:
 *
 *   patientId -> profile -> IDs
 *
 * For the structured form:
 *
 *   names -> reference catalog -> IDs
 *
 * This is important because the form sends names such as "aspirin",
 * while the interaction repository queries Drug.id values.
 */
export async function checkRisks(
  request: RiskCheckRequest,
  deps: RiskCheckDeps
): Promise<Risk[]> {
  const profile = await resolveProfile(
    request,
    deps.patientProfile,
    deps.references
  );

  const [
    interactionRisks,
    allergyRisks,
    contraindicationRisks,
  ] = await Promise.all([
    findInteractionRisks(
      profile.medicationIds,
      {
        interactions: deps.interactions,
      }
    ),

    findAllergyRisks(
      profile.medicationIds,
      profile.allergyIds,
      {
        allergyLinks: deps.allergyLinks,
      }
    ),

    findContraindicationRisks(
      profile.medicationIds,
      profile.conditionIds,
      {
        contraindications: deps.contraindications,
      }
    ),
  ]);

  return [
    ...interactionRisks,
    ...allergyRisks,
    ...contraindicationRisks,
  ];
}

/**
 * Incremental recheck.
 *
 * This path already works with IDs because it is used when a stored
 * patient profile is being updated.
 *
 * It intentionally does NOT perform name resolution.
 */
export async function checkIncrementalRisks(
  patientId: string,
  newDrugId: string,
  deps: RiskCheckDeps
): Promise<Risk[]> {
  const profile = await deps.patientProfile.getProfile(
    patientId
  );

  if (!profile) {
    throw new PatientNotFoundError(patientId);
  }

  const existingDrugIds = profile.medicationIds.filter(
    (id) => id !== newDrugId
  );

  const [
    interactionRisks,
    allergyRisks,
    contraindicationRisks,
  ] = await Promise.all([
    findIncrementalInteractionRisks(
      newDrugId,
      existingDrugIds,
      {
        interactions: deps.interactions,
      }
    ),

    findAllergyRisks(
      [newDrugId],
      profile.allergyIds,
      {
        allergyLinks: deps.allergyLinks,
      }
    ),

    findContraindicationRisks(
      [newDrugId],
      profile.conditionIds,
      {
        contraindications: deps.contraindications,
      }
    ),
  ]);

  return [
    ...interactionRisks,
    ...allergyRisks,
    ...contraindicationRisks,
  ];
}

/**
 * Resolves the incoming risk-check request.
 *
 * There are two supported modes:
 *
 * 1. Stored patient:
 *      patientId -> stored IDs
 *
 * 2. Structured form:
 *      names -> Neo4j IDs
 *
 * The chatbot can continue using whichever path it currently uses.
 * The important part is that the form no longer sends raw medicine
 * names into findAmong().
 */
async function resolveProfile(
  request: RiskCheckRequest,
  patientProfile: PatientProfileLookupPort,
  references: RiskReferenceCatalogPort
): Promise<PatientProfile> {
  /**
   * Stored patient profile.
   *
   * These values are already Neo4j IDs and must not be resolved
   * as names again.
   */
  if (request.patientId) {
    const profile = await patientProfile.getProfile(
      request.patientId
    );

    if (!profile) {
      throw new PatientNotFoundError(request.patientId);
    }

    return profile;
  }

  /**
   * Structured form.
   *
   * The frontend sends names, not Neo4j IDs.
   */
  const medicationNames = normalizeNames(
    request.medications ?? []
  );

  const allergyNames = normalizeNames(
    request.allergies ?? []
  );

  const conditionNames = normalizeNames(
    request.conditions ?? []
  );

  const [
    medications,
    allergies,
    conditions,
  ] = await Promise.all([
    references.findDrugsByNames(medicationNames),

    references.findAllergensByNames(allergyNames),

    references.findDiseasesByNames(conditionNames),
  ]);

  const foundMedicationNames = new Set(
    medications.map((drug) =>
      drug.name.trim().toLowerCase()
    )
  );

  const foundAllergyNames = new Set(
    allergies.map((allergen) =>
      allergen.name.trim().toLowerCase()
    )
  );

  const foundConditionNames = new Set(
    conditions.map((condition) =>
      condition.name.trim().toLowerCase()
    )
  );

  /**
   * Only throw for an explicitly entered reference that cannot
   * be resolved.
   *
   * Empty fields are allowed.
   */
  const missingMedications = medicationNames.filter(
    (name) =>
      !foundMedicationNames.has(
        name.trim().toLowerCase()
      )
  );

  const missingAllergies = allergyNames.filter(
    (name) =>
      !foundAllergyNames.has(
        name.trim().toLowerCase()
      )
  );

  const missingConditions = conditionNames.filter(
    (name) =>
      !foundConditionNames.has(
        name.trim().toLowerCase()
      )
  );

  if (missingMedications.length > 0) {
    throw new RiskReferenceNotFoundError(
      "medication",
      missingMedications
    );
  }

  if (missingAllergies.length > 0) {
    throw new RiskReferenceNotFoundError(
      "allergy",
      missingAllergies
    );
  }

  if (missingConditions.length > 0) {
    throw new RiskReferenceNotFoundError(
      "condition",
      missingConditions
    );
  }

  return {
    medicationIds: medications.map(
      (drug) => drug.id
    ),

    allergyIds: allergies.map(
      (allergen) => allergen.id
    ),

    conditionIds: conditions.map(
      (condition) => condition.id
    ),
  };
}

/**
 * Normalizes user input without changing the actual database
 * names.
 *
 * Example:
 *
 *   [" aspirin ", "WARFARIN", ""]
 *
 * becomes:
 *
 *   ["aspirin", "WARFARIN"]
 */
function normalizeNames(
  values: string[]
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}