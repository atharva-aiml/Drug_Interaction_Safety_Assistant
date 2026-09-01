import { getSession } from "../../../db/neo4jClient.js";
import { PatientProfile, PatientProfileLookupPort } from "../application/ports.js";

export class Neo4jPatientProfileLookup implements PatientProfileLookupPort {
  async getProfile(patientId: string): Promise<PatientProfile | undefined> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (p:Patient {id: $patientId})
         OPTIONAL MATCH (p)-[:TAKES]->(d:Drug)
         OPTIONAL MATCH (p)-[:HAS_ALLERGY]->(a:Allergen)
         OPTIONAL MATCH (p)-[:HAS_CONDITION]->(c:Disease)
         RETURN collect(DISTINCT d.id) AS drugIds, collect(DISTINCT a.id) AS allergenIds, collect(DISTINCT c.id) AS diseaseIds,
                count(p) AS patientCount`,
        { patientId }
      );
      const record = result.records[0];
      if (!record || record.get("patientCount").toNumber() === 0) return undefined;
      return {
        medicationIds: (record.get("drugIds") as string[]).filter(Boolean),
        allergyIds: (record.get("allergenIds") as string[]).filter(Boolean),
        conditionIds: (record.get("diseaseIds") as string[]).filter(Boolean),
      };
    } finally {
      await session.close();
    }
  }
}
