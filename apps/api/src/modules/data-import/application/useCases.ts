import {
  ImportJob,
  ImportRowError,
} from "@disa/shared-types";

import {
  CreateAllergyLinkDeps,
  createAllergyLink,
} from "../../allergy-links/application/useCases.js";

import {
  CreateContraindicationDeps,
  createContraindication,
} from "../../contraindications/application/useCases.js";

import {
  CreateInteractionDeps,
  createInteraction,
} from "../../interactions/application/useCases.js";

import {
  normalizeName,
  ParsedRelationships,
  validateDrugRow,
} from "../domain/importValidation.js";

import {
  AllergenImportRepository,
  DiseaseImportRepository,
  DrugImportRepository,
  ImportJobNotFoundError,
  ImportJobRepository,
} from "./ports.js";

export interface StartImportDeps {
  importJobs: ImportJobRepository;
  newId: () => string;
  now: () => string;
}

export async function startImportJob(
  deps: StartImportDeps
): Promise<ImportJob> {
  const timestamp =
    deps.now();

  const job: ImportJob = {
    id: deps.newId(),
    entityType: "drug",
    status: "queued",
    acceptedCount: 0,
    rejectedCount: 0,
    errors: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await deps.importJobs.create(
    job
  );

  return job;
}

export interface ProcessImportDeps {
  importJobs: ImportJobRepository;
  drugImport: DrugImportRepository;
  allergenImport: AllergenImportRepository;
  diseaseImport: DiseaseImportRepository;

  interactions: CreateInteractionDeps;

  allergyLinks: CreateAllergyLinkDeps;

  contraindications: CreateContraindicationDeps;

  now: () => string;
}

interface CreatedDrug {
  rowNumber: number;
  id: string;
  name: string;
  relationships: ParsedRelationships;
}

/**
 * Process the complete drug CSV.
 *
 * Important:
 *
 * PASS 1
 *   Create ALL valid Drug nodes.
 *
 * PASS 2
 *   Resolve and create relationships.
 *
 * This means a relationship such as:
 *
 * Warfarin -> Amiodarone
 *
 * works even when Amiodarone appears later in the CSV.
 *
 * It also means a medication with zero interactions is
 * still imported as a Drug node.
 */
export async function processDrugImport(
  jobId: string,
  rows: Record<string, string>[],
  deps: ProcessImportDeps
): Promise<void> {
  try {
    await deps.importJobs.update(
      jobId,
      {
        status: "validating",
      }
    );

    const acceptedRows: {
      rowNumber: number;
      row: Record<string, string>;
      relationships: ParsedRelationships;
    }[] = [];

    const errors: ImportRowError[] =
      [];

    /**
     * ---------------------------
     * VALIDATION
     * ---------------------------
     *
     * Only truly unusable Drug rows
     * are rejected.
     */
    rows.forEach(
      (row, index) => {
        const result =
          validateDrugRow(row);

        if (result.accepted) {
          acceptedRows.push({
            rowNumber:
              index + 1,
            row,
            relationships:
              result.relationships!,
          });
        } else {
          errors.push({
            rowNumber:
              index + 1,
            reason:
              result.reason!,
          });
        }
      }
    );

    const rejectedByValidation =
      errors.length;

    await deps.importJobs.update(
      jobId,
      {
        status: "importing",
      }
    );

    /**
     * ---------------------------
     * PASS 1
     * CREATE ALL DRUGS
     * ---------------------------
     *
     * Every accepted row gets a Drug node.
     *
     * This is the critical fix for your current
     * "only 10 medications" problem.
     */
    const drugNameToId =
      new Map<string, string>();

    const createdDrugs: CreatedDrug[] =
      [];

    for (
      const accepted of acceptedRows
    ) {
      try {
        const created =
          await deps.drugImport.create(
            {
              name:
                accepted.row.name.trim(),

              genericName:
                accepted.row.genericName.trim(),

              drugClass:
                accepted.row.drugClass.trim(),

              dosageForm:
                accepted.row.dosageForm.trim(),
            }
          );

        const normalizedName =
          normalizeName(
            created.name
          );

        drugNameToId.set(
          normalizedName,
          created.id
        );

        createdDrugs.push({
          rowNumber:
            accepted.rowNumber,

          id: created.id,

          name:
            created.name,

          relationships:
            accepted.relationships,
        });
      } catch (err) {
        /**
         * A genuine database failure should reject
         * this particular drug row, but should not
         * stop the entire import.
         */
        errors.push({
          rowNumber:
            accepted.rowNumber,

          reason:
            `Drug "${accepted.row.name}": ${err instanceof Error
              ? err.message
              : "failed to create drug"
            }`,
        });
      }
    }

    /**
     * ---------------------------
     * PASS 1B
     * CREATE ALL ALLERGENS
     * AND DISEASES
     * ---------------------------
     */
    const allergenNameToId =
      new Map<string, string>();

    const diseaseNameToId =
      new Map<string, string>();

    const allergenNames =
      new Set<string>();

    const diseaseNames =
      new Set<string>();

    for (
      const drug of createdDrugs
    ) {
      for (
        const entry of
        drug.relationships
          .containsAllergen
      ) {
        allergenNames.add(
          entry.name
        );
      }

      for (
        const entry of
        drug.relationships
          .contraindicatedFor
      ) {
        diseaseNames.add(
          entry.name
        );
      }
    }

    for (
      const name of allergenNames
    ) {
      try {
        const allergen =
          await deps.allergenImport
            .findOrCreateByName(
              name.trim()
            );

        allergenNameToId.set(
          normalizeName(name),
          allergen.id
        );
      } catch (err) {
        errors.push({
          rowNumber: 0,
          reason:
            `Allergen "${name}": ${err instanceof Error
              ? err.message
              : "failed to create allergen"
            }`,
        });
      }
    }

    for (
      const name of diseaseNames
    ) {
      try {
        const disease =
          await deps.diseaseImport
            .findOrCreateByName(
              name.trim()
            );

        diseaseNameToId.set(
          normalizeName(name),
          disease.id
        );
      } catch (err) {
        errors.push({
          rowNumber: 0,
          reason:
            `Condition "${name}": ${err instanceof Error
              ? err.message
              : "failed to create condition"
            }`,
        });
      }
    }

    /**
     * ---------------------------
     * PASS 2
     * CREATE RELATIONSHIPS
     * ---------------------------
     */
    const linkedInteractionPairs =
      new Set<string>();

    for (
      const drug of createdDrugs
    ) {
      /**
       * -------------------------
       * INTERACTIONS
       * -------------------------
       */
      for (
        const entry of
        drug.relationships
          .interactsWith
      ) {
        const targetId =
          drugNameToId.get(
            normalizeName(
              entry.name
            )
          );

        /**
         * Important:
         *
         * If a relationship points to a drug that
         * doesn't exist in the file, we report it,
         * but the source Drug remains safely imported.
         */
        if (!targetId) {
          errors.push({
            rowNumber:
              drug.rowNumber,

            reason:
              `interactsWith: unknown drug "${entry.name}" — no matching Drug node was found.`,
          });

          continue;
        }

        /**
         * Don't allow self-interaction.
         */
        if (
          targetId === drug.id
        ) {
          errors.push({
            rowNumber:
              drug.rowNumber,

            reason:
              `interactsWith: "${entry.name}" resolves to the same drug.`,
          });

          continue;
        }

        /**
         * Because Neo4j stores the interaction as an
         * undirected relationship, A-B and B-A are
         * the same pair.
         */
        const pairKey =
          [
            drug.id,
            targetId,
          ]
            .sort()
            .join("::");

        if (
          linkedInteractionPairs.has(
            pairKey
          )
        ) {
          continue;
        }

        linkedInteractionPairs.add(
          pairKey
        );

        try {
          await createInteraction(
            drug.id,
            targetId,
            entry.severity,
            deps.interactions,
            entry.risk,
            entry.tip
          );
        } catch (err) {
          errors.push({
            rowNumber:
              drug.rowNumber,

            reason:
              `interactsWith "${entry.name}": ${err instanceof Error
                ? err.message
                : "failed to link interaction"
              }`,
          });
        }
      }

      /**
       * -------------------------
       * ALLERGEN LINKS
       * -------------------------
       */
      for (
        const entry of
        drug.relationships
          .containsAllergen
      ) {
        const allergenId =
          allergenNameToId.get(
            normalizeName(
              entry.name
            )
          );

        if (!allergenId) {
          errors.push({
            rowNumber:
              drug.rowNumber,

            reason:
              `containsAllergen "${entry.name}": allergen could not be resolved.`,
          });

          continue;
        }

        try {
          await createAllergyLink(
            drug.id,
            allergenId,
            entry.severity,
            deps.allergyLinks
          );
        } catch (err) {
          errors.push({
            rowNumber:
              drug.rowNumber,

            reason:
              `containsAllergen "${entry.name}": ${err instanceof Error
                ? err.message
                : "failed to link allergen"
              }`,
          });
        }
      }

      /**
       * -------------------------
       * CONTRAINDICATIONS
       * -------------------------
       */
      for (
        const entry of
        drug.relationships
          .contraindicatedFor
      ) {
        const diseaseId =
          diseaseNameToId.get(
            normalizeName(
              entry.name
            )
          );

        if (!diseaseId) {
          errors.push({
            rowNumber:
              drug.rowNumber,

            reason:
              `contraindicatedFor "${entry.name}": condition could not be resolved.`,
          });

          continue;
        }

        try {
          await createContraindication(
            drug.id,
            diseaseId,
            entry.severity,
            deps.contraindications
          );
        } catch (err) {
          errors.push({
            rowNumber:
              drug.rowNumber,

            reason:
              `contraindicatedFor "${entry.name}": ${err instanceof Error
                ? err.message
                : "failed to link contraindication"
              }`,
          });
        }
      }
    }

    /**
     * ---------------------------
     * COMPLETE
     * ---------------------------
     *
     * acceptedCount represents actual Drug nodes
     * successfully created/updated.
     */
    await deps.importJobs.update(
      jobId,
      {
        status: "complete",

        acceptedCount:
          createdDrugs.length,

        rejectedCount:
          rejectedByValidation,

        errors,
      }
    );
  } catch (err) {
    await deps.importJobs.update(
      jobId,
      {
        status: "failed",

        errors: [
          {
            rowNumber: 0,
            reason:
              err instanceof Error
                ? err.message
                : "Unexpected import failure.",
          },
        ],
      }
    );
  }
}

/**
 * Retrieve an import job.
 */
export async function getImportJob(
  id: string,
  deps: {
    importJobs: ImportJobRepository;
  }
): Promise<ImportJob> {
  const job =
    await deps.importJobs.findById(
      id
    );

  if (!job) {
    throw new ImportJobNotFoundError(
      id
    );
  }

  return job;
}