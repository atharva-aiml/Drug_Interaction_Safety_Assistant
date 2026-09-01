import { v4 as uuid } from "uuid";
import { Allergen } from "@disa/shared-types";
import { getSession } from "../../db/neo4jClient.js";

export async function createAllergen(name: string): Promise<Allergen> {
  const id = uuid();
  const session = getSession();
  try {
    await session.run(`CREATE (a:Allergen {id: $id, name: $name})`, { id, name });
    return { id, name };
  } finally {
    await session.close();
  }
}

export async function listAllergens(): Promise<Allergen[]> {
  const session = getSession();
  try {
    const result = await session.run("MATCH (a:Allergen) RETURN a ORDER BY a.name");
    return result.records.map((r) => ({ id: r.get("a").properties.id, name: r.get("a").properties.name }));
  } finally {
    await session.close();
  }
}
