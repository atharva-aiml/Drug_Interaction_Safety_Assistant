import { AllergyLink, Severity } from "@disa/shared-types";
import { getSession } from "../../../db/neo4jClient.js";
import { AllergyLinkRepository } from "../application/ports.js";

export class Neo4jAllergyLinkRepository implements AllergyLinkRepository {
  async create(id: string, drugId: string, allergenId: string, severity: Severity): Promise<AllergyLink> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (d:Drug {id: $drugId}), (a:Allergen {id: $allergenId})
         CREATE (d)-[r:CONTAINS_ALLERGEN {id: $id, severity: $severity}]->(a)
         RETURN d, a, r`,
        { id, drugId, allergenId, severity }
      );
      const record = result.records[0];
      return {
        id,
        drug: { id: record.get("d").properties.id, name: record.get("d").properties.name },
        allergen: { id: record.get("a").properties.id, name: record.get("a").properties.name },
        severity,
      };
    } finally {
      await session.close();
    }
  }

  async findConflicts(drugIds: string[], allergenIds: string[]): Promise<AllergyLink[]> {
    if (drugIds.length === 0 || allergenIds.length === 0) return [];
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (d:Drug)-[r:CONTAINS_ALLERGEN]->(a:Allergen)
         WHERE d.id IN $drugIds AND a.id IN $allergenIds
         RETURN d, a, r`,
        { drugIds, allergenIds }
      );
      return result.records.map((record) => ({
        id: record.get("r").properties.id,
        drug: { id: record.get("d").properties.id, name: record.get("d").properties.name },
        allergen: { id: record.get("a").properties.id, name: record.get("a").properties.name },
        severity: record.get("r").properties.severity,
      }));
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<AllergyLink | undefined> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (d:Drug)-[r:CONTAINS_ALLERGEN {id: $id}]->(a:Allergen) RETURN d, a, r`,
        { id }
      );
      if (result.records.length === 0) return undefined;
      const record = result.records[0];
      return {
        id: record.get("r").properties.id,
        drug: { id: record.get("d").properties.id, name: record.get("d").properties.name },
        allergen: { id: record.get("a").properties.id, name: record.get("a").properties.name },
        severity: record.get("r").properties.severity,
      };
    } finally {
      await session.close();
    }
  }
}
