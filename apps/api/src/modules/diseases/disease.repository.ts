import { v4 as uuid } from "uuid";
import { Disease } from "@disa/shared-types";
import { getSession } from "../../db/neo4jClient.js";

export async function createDisease(name: string, icdCode?: string): Promise<Disease> {
  const id = uuid();
  const session = getSession();
  try {
    await session.run(
      `CREATE (d:Disease {id: $id, name: $name, icdCode: $icdCode})`,
      { id, name, icdCode: icdCode ?? null }
    );
    return { id, name, icdCode };
  } finally {
    await session.close();
  }
}

export async function listDiseases(): Promise<Disease[]> {
  const session = getSession();
  try {
    const result = await session.run("MATCH (d:Disease) RETURN d ORDER BY d.name");
    return result.records.map((r) => {
      const props = r.get("d").properties;
      return { id: props.id, name: props.name, icdCode: props.icdCode ?? undefined };
    });
  } finally {
    await session.close();
  }
}
