import { v4 as uuid } from "uuid";
import { getSession } from "../../../db/neo4jClient.js";
import { DiseaseImportRepository } from "../application/ports.js";

export class Neo4jDiseaseImportRepository implements DiseaseImportRepository {
  async findOrCreateByName(name: string): Promise<{ id: string; name: string }> {
    const session = getSession();
    try {
      const result = await session.run(
        `MERGE (d:Disease {name: $name})
         ON CREATE SET d.id = $id
         RETURN d`,
        { name, id: uuid() }
      );
      const props = result.records[0].get("d").properties;
      return { id: props.id, name: props.name };
    } finally {
      await session.close();
    }
  }
}
