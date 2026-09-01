import { getSession } from "../../../db/neo4jClient.js";
import { AssistantCatalogPort, CatalogEntry } from "../application/ports.js";

async function listByLabel(label: "Drug" | "Allergen" | "Disease"): Promise<CatalogEntry[]> {
  const session = getSession();
  try {
    const deletedFilter = label === "Drug" ? "WHERE n.deletedAt IS NULL" : "";
    const result = await session.run(`MATCH (n:${label}) ${deletedFilter} RETURN n.id AS id, n.name AS name`);
    return result.records.map((r) => ({ id: r.get("id") as string, name: r.get("name") as string }));
  } finally {
    await session.close();
  }
}

/**
 * Own small read-only catalog port for entity-name resolution — re-implemented
 * here rather than reused from `drugs`/`allergens`/`diseases`' own repository
 * functions, same "own your infrastructure" precedent CLAUDE.md documents for
 * every other module's catalog lookups (e.g. interactions/allergy-links/
 * contraindications each having their own `existingDrugIds`).
 */
export class Neo4jAssistantCatalog implements AssistantCatalogPort {
  listDrugs(): Promise<CatalogEntry[]> {
    return listByLabel("Drug");
  }
  listAllergens(): Promise<CatalogEntry[]> {
    return listByLabel("Allergen");
  }
  listDiseases(): Promise<CatalogEntry[]> {
    return listByLabel("Disease");
  }
}
