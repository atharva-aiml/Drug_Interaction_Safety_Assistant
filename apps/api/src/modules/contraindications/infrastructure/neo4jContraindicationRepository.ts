import { ContraindicationLink, Severity } from "@disa/shared-types";
import { getSession } from "../../../db/neo4jClient.js";
import { ContraindicationRepository } from "../application/ports.js";

export class Neo4jContraindicationRepository implements ContraindicationRepository {
  async create(id: string, drugId: string, diseaseId: string, severity: Severity): Promise<ContraindicationLink> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (d:Drug {id: $drugId}), (dis:Disease {id: $diseaseId})
         CREATE (d)-[r:CONTRAINDICATED_FOR {id: $id, severity: $severity}]->(dis)
         RETURN d, dis, r`,
        { id, drugId, diseaseId, severity }
      );
      const record = result.records[0];
      return {
        id,
        drug: { id: record.get("d").properties.id, name: record.get("d").properties.name },
        disease: { id: record.get("dis").properties.id, name: record.get("dis").properties.name },
        severity,
      };
    } finally {
      await session.close();
    }
  }

  async findConflicts(drugIds: string[], diseaseIds: string[]): Promise<ContraindicationLink[]> {
    if (drugIds.length === 0 || diseaseIds.length === 0) return [];
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (d:Drug)-[r:CONTRAINDICATED_FOR]->(dis:Disease)
         WHERE d.id IN $drugIds AND dis.id IN $diseaseIds
         RETURN d, dis, r`,
        { drugIds, diseaseIds }
      );
      return result.records.map((record) => ({
        id: record.get("r").properties.id,
        drug: { id: record.get("d").properties.id, name: record.get("d").properties.name },
        disease: { id: record.get("dis").properties.id, name: record.get("dis").properties.name },
        severity: record.get("r").properties.severity,
      }));
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<ContraindicationLink | undefined> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (d:Drug)-[r:CONTRAINDICATED_FOR {id: $id}]->(dis:Disease) RETURN d, dis, r`,
        { id }
      );
      if (result.records.length === 0) return undefined;
      const record = result.records[0];
      return {
        id: record.get("r").properties.id,
        drug: { id: record.get("d").properties.id, name: record.get("d").properties.name },
        disease: { id: record.get("dis").properties.id, name: record.get("dis").properties.name },
        severity: record.get("r").properties.severity,
      };
    } finally {
      await session.close();
    }
  }
}
