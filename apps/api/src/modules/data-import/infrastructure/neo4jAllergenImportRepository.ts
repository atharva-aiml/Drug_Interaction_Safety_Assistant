import { v4 as uuid } from "uuid";
import { getSession } from "../../../db/neo4jClient.js";
import { AllergenImportRepository } from "../application/ports.js";

export class Neo4jAllergenImportRepository implements AllergenImportRepository {
  async findOrCreateByName(name: string): Promise<{ id: string; name: string }> {
    const session = getSession();
    try {
      const result = await session.run(
        `MERGE (a:Allergen {name: $name})
         ON CREATE SET a.id = $id
         RETURN a`,
        { name, id: uuid() }
      );
      const props = result.records[0].get("a").properties;
      return { id: props.id, name: props.name };
    } finally {
      await session.close();
    }
  }
}
