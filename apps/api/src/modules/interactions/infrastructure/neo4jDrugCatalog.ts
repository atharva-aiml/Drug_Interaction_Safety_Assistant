import { getSession } from "../../../db/neo4jClient.js";
import { DrugCatalogPort } from "../application/ports.js";

function normalizeName(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export class Neo4jDrugCatalog
  implements DrugCatalogPort {
  async existingDrugIds(
    ids: string[]
  ): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }

    const session =
      getSession();

    try {
      const result =
        await session.run(
          `
          MATCH (d:Drug)
          WHERE d.id IN $ids
            AND d.deletedAt IS NULL

          RETURN d.id AS id
          `,
          {
            ids,
          }
        );

      return new Set(
        result.records.map(
          (record) =>
            record.get(
              "id"
            ) as string
        )
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Resolve user-entered medication names.
   *
   * Supported:
   *
   *   aspirin
   *   Aspirin
   *   ASPIRIN
   *   acetylsalicylic acid
   *
   * Matching uses both Drug.name and Drug.genericName.
   */
  async findByNames(
    names: string[]
  ): Promise<
    Array<{
      id: string;
      name: string;
    }>
  > {
    if (names.length === 0) {
      return [];
    }

    const normalizedNames =
      Array.from(
        new Set(
          names
            .filter(
              (
                name
              ): name is string =>
                typeof name ===
                "string"
            )
            .map(
              normalizeName
            )
            .filter(Boolean)
        )
      );

    if (
      normalizedNames.length ===
      0
    ) {
      return [];
    }

    const session =
      getSession();

    try {
      const result =
        await session.run(
          `
          MATCH (d:Drug)

          WHERE d.deletedAt IS NULL
            AND (
              toLower(trim(d.name))
                IN $names

              OR

              toLower(trim(d.genericName))
                IN $names

              OR

              d.normalizedName
                IN $names
            )

          RETURN
            d.id AS id,
            d.name AS name

          ORDER BY d.name
          `,
          {
            names:
              normalizedNames,
          }
        );

      /**
       * Protect against accidental duplicate matches.
       */
      const seen =
        new Set<string>();

      const drugs: Array<{
        id: string;
        name: string;
      }> = [];

      for (
        const record of
        result.records
      ) {
        const id =
          record.get(
            "id"
          ) as string;

        if (
          seen.has(id)
        ) {
          continue;
        }

        seen.add(id);

        drugs.push({
          id,

          name:
            record.get(
              "name"
            ) as string,
        });
      }

      return drugs;
    } finally {
      await session.close();
    }
  }
}