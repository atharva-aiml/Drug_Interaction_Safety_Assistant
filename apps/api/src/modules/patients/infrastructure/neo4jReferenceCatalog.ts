import { getSession } from "../../../db/neo4jClient.js";
import { ReferenceCatalogPort } from "../application/ports.js";

/**
 * Returns existing IDs for a Neo4j label.
 *
 * This is retained for compatibility with parts of the application
 * that work directly with IDs.
 */
async function existingIds(
  label: "Drug" | "Allergen" | "Disease",
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) {
    return new Set();
  }

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (n:${label})
      WHERE n.id IN $ids
        AND n.deletedAt IS NULL
      RETURN n.id AS id
      `,
      {
        ids,
      }
    );

    return new Set(
      result.records.map(
        (record) => record.get("id") as string
      )
    );
  } finally {
    await session.close();
  }
}

/**
 * Finds nodes by their human-readable names.
 *
 * Matching is:
 *
 *   case-insensitive
 *   whitespace-insensitive
 *
 * Example:
 *
 *   "aspirin"
 *   "ASPIRIN"
 *   " Aspirin "
 *
 * all resolve to the same Drug node.
 */
async function findByNames(
  label: "Drug" | "Allergen" | "Disease",
  names: string[]
): Promise<Array<{ id: string; name: string }>> {
  if (names.length === 0) {
    return [];
  }

  const normalizedNames = Array.from(
    new Set(
      names
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  if (normalizedNames.length === 0) {
    return [];
  }

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (n:${label})
      WHERE toLower(trim(n.name)) IN $names
        AND n.deletedAt IS NULL
      RETURN n.id AS id, n.name AS name
      `,
      {
        names: normalizedNames,
      }
    );

    return result.records.map((record) => ({
      id: record.get("id") as string,
      name: record.get("name") as string,
    }));
  } finally {
    await session.close();
  }
}

export class Neo4jReferenceCatalog
  implements ReferenceCatalogPort {
  /**
   * Drug lookup used by the structured risk-check form.
   */
  findDrugsByNames(
    names: string[]
  ): Promise<Array<{ id: string; name: string }>> {
    return findByNames("Drug", names);
  }

  /**
   * Allergen lookup used by the structured risk-check form.
   */
  findAllergensByNames(
    names: string[]
  ): Promise<Array<{ id: string; name: string }>> {
    return findByNames("Allergen", names);
  }

  /**
   * Disease lookup used by the structured risk-check form.
   */
  findDiseasesByNames(
    names: string[]
  ): Promise<Array<{ id: string; name: string }>> {
    return findByNames("Disease", names);
  }

  /**
   * Existing ID helpers.
   *
   * These can still be used by other parts of the backend.
   */
  existingDrugIds(
    ids: string[]
  ): Promise<Set<string>> {
    return existingIds("Drug", ids);
  }

  existingAllergenIds(
    ids: string[]
  ): Promise<Set<string>> {
    return existingIds("Allergen", ids);
  }

  existingConditionIds(
    ids: string[]
  ): Promise<Set<string>> {
    return existingIds("Disease", ids);
  }
}