import { ImportJob } from "@disa/shared-types";
import { getSession } from "../../../db/neo4jClient.js";
import { ImportJobRepository } from "../application/ports.js";

function toNode(job: ImportJob) {
  return {
    id: job.id,
    entityType: job.entityType,
    status: job.status,
    acceptedCount: job.acceptedCount,
    rejectedCount: job.rejectedCount,
    errors: JSON.stringify(job.errors),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function fromProps(props: Record<string, unknown>): ImportJob {
  return {
    id: props.id as string,
    entityType: props.entityType as ImportJob["entityType"],
    status: props.status as ImportJob["status"],
    acceptedCount: (props.acceptedCount as number) ?? 0,
    rejectedCount: (props.rejectedCount as number) ?? 0,
    errors: JSON.parse((props.errors as string) ?? "[]"),
    createdAt: props.createdAt as string,
    updatedAt: props.updatedAt as string,
  };
}

export class Neo4jImportJobRepository implements ImportJobRepository {
  async create(job: ImportJob): Promise<void> {
    const session = getSession();
    try {
      await session.run(`CREATE (j:ImportJob $props)`, { props: toNode(job) });
    } finally {
      await session.close();
    }
  }

  async update(
    id: string,
    patch: Partial<{ status: string; acceptedCount: number; rejectedCount: number; errors: unknown }>
  ): Promise<void> {
    const session = getSession();
    try {
      // Build the SET clause and its params together — Neo4j params can't hold
      // `undefined`, so only fields actually present in the patch go in either.
      const setClauses = ["j.updatedAt = $updatedAt"];
      const params: Record<string, unknown> = { id, updatedAt: new Date().toISOString() };

      if (patch.status !== undefined) {
        setClauses.push("j.status = $status");
        params.status = patch.status;
      }
      if (patch.acceptedCount !== undefined) {
        setClauses.push("j.acceptedCount = $acceptedCount");
        params.acceptedCount = patch.acceptedCount;
      }
      if (patch.rejectedCount !== undefined) {
        setClauses.push("j.rejectedCount = $rejectedCount");
        params.rejectedCount = patch.rejectedCount;
      }
      if (patch.errors !== undefined) {
        setClauses.push("j.errors = $errors");
        params.errors = JSON.stringify(patch.errors);
      }

      await session.run(`MATCH (j:ImportJob {id: $id}) SET ${setClauses.join(", ")}`, params);
    } finally {
      await session.close();
    }
  }

  async findById(id: string): Promise<ImportJob | undefined> {
    const session = getSession();
    try {
      const result = await session.run(`MATCH (j:ImportJob {id: $id}) RETURN j`, { id });
      if (result.records.length === 0) return undefined;
      return fromProps(result.records[0].get("j").properties);
    } finally {
      await session.close();
    }
  }
}
