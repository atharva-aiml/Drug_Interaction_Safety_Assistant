import { QueryLogEntry } from "@disa/shared-types";
import { getSession } from "../../../db/neo4jClient.js";
import { QueryLogRepository } from "../application/ports.js";

function toNode(entry: QueryLogEntry) {
  return {
    id: entry.id,
    queryType: entry.queryType,
    inputSummary: JSON.stringify(entry.inputSummary),
    resultSummary: JSON.stringify(entry.resultSummary),
    createdAt: entry.createdAt,
  };
}

function fromProps(props: Record<string, unknown>): QueryLogEntry {
  return {
    id: props.id as string,
    queryType: props.queryType as QueryLogEntry["queryType"],
    inputSummary: JSON.parse(props.inputSummary as string),
    resultSummary: JSON.parse(props.resultSummary as string),
    createdAt: props.createdAt as string,
  };
}

export class Neo4jQueryLogRepository implements QueryLogRepository {
  async create(entry: QueryLogEntry): Promise<QueryLogEntry> {
    const session = getSession();
    try {
      if (entry.patientId) {
        await session.run(
          `CREATE (q:QueryLogEntry $props)
           WITH q
           MATCH (p:Patient {id: $patientId})
           CREATE (q)-[:REFERENCED]->(p)`,
          { props: toNode(entry), patientId: entry.patientId }
        );
      } else {
        await session.run(`CREATE (q:QueryLogEntry $props)`, { props: toNode(entry) });
      }
      return entry;
    } finally {
      await session.close();
    }
  }

  async list(): Promise<QueryLogEntry[]> {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (q:QueryLogEntry) RETURN q ORDER BY q.createdAt DESC`
      );
      return result.records.map((r) => fromProps(r.get("q").properties));
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<QueryLogEntry | undefined> {
    const session = getSession();
    try {
      const result = await session.run(`MATCH (q:QueryLogEntry {id: $id}) RETURN q`, { id });
      if (result.records.length === 0) return undefined;
      return fromProps(result.records[0].get("q").properties);
    } finally {
      await session.close();
    }
  }
}
