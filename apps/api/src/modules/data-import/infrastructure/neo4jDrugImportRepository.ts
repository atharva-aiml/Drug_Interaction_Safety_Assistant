import { v4 as uuid } from "uuid";
import { Drug } from "@disa/shared-types";
import { getSession } from "../../../db/neo4jClient.js";
import { DrugImportRepository } from "../application/ports.js";

function normalizeDrugName(
  name: string
): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export class Neo4jDrugImportRepository
  implements DrugImportRepository {
  /**
   * Creates or updates a Drug node.
   *
   * The normalized name is stored separately so that
   * lookups remain case/whitespace insensitive.
   *
   * Example:
   *
   * Aspirin
   * aspirin
   *  ASPIRIN
   *
   * all resolve to the same logical medication.
   */
  async create(
    drug: Omit<Drug, "id">
  ): Promise<Drug> {
    const session =
      getSession();

    try {
      const cleanName =
        drug.name
          .trim()
          .replace(/\s+/g, " ");

      const normalizedName =
        normalizeDrugName(
          cleanName
        );

      const result =
        await session.run(
          `
          MERGE (d:Drug {
            normalizedName: $normalizedName
          })

          ON CREATE SET
            d.id = $id,
            d.name = $name,
            d.normalizedName = $normalizedName,
            d.genericName = $genericName,
            d.drugClass = $drugClass,
            d.dosageForm = $dosageForm

          ON MATCH SET
            d.name = $name,
            d.normalizedName = $normalizedName,
            d.genericName = $genericName,
            d.drugClass = $drugClass,
            d.dosageForm = $dosageForm,
            d.deletedAt = NULL

          RETURN d
          `,
          {
            id: uuid(),

            name:
              cleanName,

            normalizedName,

            genericName:
              drug.genericName
                ?.trim() ?? "",

            drugClass:
              drug.drugClass
                ?.trim() ?? "",

            dosageForm:
              drug.dosageForm
                ?.trim() ?? "",
          }
        );

      if (
        result.records.length === 0
      ) {
        throw new Error(
          `Neo4j did not return the Drug "${cleanName}".`
        );
      }

      const props =
        result.records[0]
          .get("d")
          .properties;

      return {
        id:
          props.id as string,

        name:
          props.name as string,

        genericName:
          props.genericName as string,

        drugClass:
          props.drugClass as string,

        dosageForm:
          props.dosageForm as string,
      };
    } finally {
      await session.close();
    }
  }
}