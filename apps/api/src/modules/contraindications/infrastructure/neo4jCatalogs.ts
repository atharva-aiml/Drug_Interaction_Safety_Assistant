import { getSession } from "../../../db/neo4jClient.js";
import { DiseaseCatalogPort, DrugCatalogPort } from "../application/ports.js";

async function existingIds(label: "Drug" | "Disease", ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const session = getSession();
  try {
    const result = await session.run(`MATCH (n:${label}) WHERE n.id IN $ids RETURN n.id AS id`, { ids });
    return new Set(result.records.map((r) => r.get("id") as string));
  } finally {
    await session.close();
  }
}

export class Neo4jDrugCatalog implements DrugCatalogPort {
  existingDrugIds(ids: string[]): Promise<Set<string>> {
    return existingIds("Drug", ids);
  }
}

export class Neo4jDiseaseCatalog implements DiseaseCatalogPort {
  existingDiseaseIds(ids: string[]): Promise<Set<string>> {
    return existingIds("Disease", ids);
  }
}
