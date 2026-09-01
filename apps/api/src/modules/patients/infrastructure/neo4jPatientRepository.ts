import { Patient, PatientProfileFields, PatientSummary } from "@disa/shared-types";
import { getSession } from "../../../db/neo4jClient.js";
import { PatientRepository } from "../application/ports.js";

function toPatient(props: Record<string, unknown>, medicationIds: string[], allergyIds: string[], conditionIds: string[]): Patient {
  return {
    id: props.id as string,
    displayName: props.displayName as string,
    createdAt: props.createdAt as string,
    medicationIds,
    allergyIds,
    conditionIds,
    ...(props.deletedAt ? { deletedAt: props.deletedAt as string } : {}),
  };
}

export class Neo4jPatientRepository implements PatientRepository {
  async create(id: string, profile: PatientProfileFields, createdAt: string): Promise<Patient> {
    const session = getSession();
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `CREATE (p:Patient {id: $id, displayName: $displayName, createdAt: $createdAt})`,
          { id, displayName: profile.displayName, createdAt }
        );
        await writeEdges(tx, id, profile);
      });
      return { id, createdAt, ...profile };
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<Patient | undefined> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (p:Patient {id: $id})
         OPTIONAL MATCH (p)-[:TAKES]->(d:Drug)
         OPTIONAL MATCH (p)-[:HAS_ALLERGY]->(a:Allergen)
         OPTIONAL MATCH (p)-[:HAS_CONDITION]->(c:Disease)
         RETURN p, collect(DISTINCT d.id) AS drugIds, collect(DISTINCT a.id) AS allergenIds, collect(DISTINCT c.id) AS conditionIds`,
        { id }
      );
      if (result.records.length === 0) return undefined;
      const record = result.records[0];
      const props = record.get("p").properties;
      return toPatient(
        props,
        (record.get("drugIds") as string[]).filter(Boolean),
        (record.get("allergenIds") as string[]).filter(Boolean),
        (record.get("conditionIds") as string[]).filter(Boolean)
      );
    } finally {
      await session.close();
    }
  }

  async list(): Promise<PatientSummary[]> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (p:Patient)
         WHERE p.deletedAt IS NULL
         OPTIONAL MATCH (p)-[:TAKES]->(d:Drug)
         RETURN p, count(DISTINCT d) AS medicationCount
         ORDER BY p.displayName`
      );
      return result.records.map((r) => ({
        id: r.get("p").properties.id,
        displayName: r.get("p").properties.displayName,
        medicationCount: r.get("medicationCount").toNumber(),
      }));
    } finally {
      await session.close();
    }
  }

  async softDelete(id: string, deletedAt: string): Promise<Patient> {
    const session = getSession();
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(`MATCH (p:Patient {id: $id}) SET p.deletedAt = $deletedAt`, { id, deletedAt });
      });
      const updated = await this.findById(id);
      if (!updated) throw new Error(`Patient ${id} disappeared during delete`);
      return updated;
    } finally {
      await session.close();
    }
  }

  async listDeleted(): Promise<PatientSummary[]> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (p:Patient)
         WHERE p.deletedAt IS NOT NULL
         OPTIONAL MATCH (p)-[:TAKES]->(d:Drug)
         RETURN p, count(DISTINCT d) AS medicationCount
         ORDER BY p.deletedAt DESC`
      );
      return result.records.map((r) => ({
        id: r.get("p").properties.id,
        displayName: r.get("p").properties.displayName,
        medicationCount: r.get("medicationCount").toNumber(),
        deletedAt: r.get("p").properties.deletedAt,
      }));
    } finally {
      await session.close();
    }
  }

  async update(id: string, profile: PatientProfileFields): Promise<Patient> {
    const session = getSession();
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(`MATCH (p:Patient {id: $id}) SET p.displayName = $displayName`, {
          id,
          displayName: profile.displayName,
        });
        await tx.run(`MATCH (p:Patient {id: $id})-[r:TAKES]->() DELETE r`, { id });
        await tx.run(`MATCH (p:Patient {id: $id})-[r:HAS_ALLERGY]->() DELETE r`, { id });
        await tx.run(`MATCH (p:Patient {id: $id})-[r:HAS_CONDITION]->() DELETE r`, { id });
        await writeEdges(tx, id, profile);
      });
      const updated = await this.findById(id);
      if (!updated) throw new Error(`Patient ${id} disappeared during update`);
      return updated;
    } finally {
      await session.close();
    }
  }
}

async function writeEdges(
  tx: { run: (query: string, params?: Record<string, unknown>) => Promise<unknown> },
  patientId: string,
  profile: PatientProfileFields
): Promise<void> {
  if (profile.medicationIds.length > 0) {
    await tx.run(
      `MATCH (p:Patient {id: $patientId}) UNWIND $ids AS drugId MATCH (d:Drug {id: drugId}) CREATE (p)-[:TAKES]->(d)`,
      { patientId, ids: profile.medicationIds }
    );
  }
  if (profile.allergyIds.length > 0) {
    await tx.run(
      `MATCH (p:Patient {id: $patientId}) UNWIND $ids AS allergenId MATCH (a:Allergen {id: allergenId}) CREATE (p)-[:HAS_ALLERGY]->(a)`,
      { patientId, ids: profile.allergyIds }
    );
  }
  if (profile.conditionIds.length > 0) {
    await tx.run(
      `MATCH (p:Patient {id: $patientId}) UNWIND $ids AS diseaseId MATCH (c:Disease {id: diseaseId}) CREATE (p)-[:HAS_CONDITION]->(c)`,
      { patientId, ids: profile.conditionIds }
    );
  }
}
