import { getSession } from "../../../db/neo4jClient.js";
import { PatientLookupPort, PatientRef } from "../application/ports.js";

export class Neo4jPatientLookup implements PatientLookupPort {
  async findById(patientId: string): Promise<PatientRef | undefined> {
    const session = getSession();
    try {
      const result = await session.run(`MATCH (p:Patient {id: $patientId}) RETURN p`, { patientId });
      if (result.records.length === 0) return undefined;
      const props = result.records[0].get("p").properties;
      return { id: props.id, displayName: props.displayName };
    } finally {
      await session.close();
    }
  }
}
