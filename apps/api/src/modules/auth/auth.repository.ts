import { getSession } from "../../db/neo4jClient.js";

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  role: "standard" | "admin";
}

export async function findUserByUsername(username: string): Promise<UserRecord | undefined> {
  const session = getSession();
  try {
    const result = await session.run(
      "MATCH (u:User {username: $username}) RETURN u",
      { username }
    );
    if (result.records.length === 0) return undefined;
    const props = result.records[0].get("u").properties;
    return {
      id: props.id,
      username: props.username,
      passwordHash: props.passwordHash,
      role: props.role,
    };
  } finally {
    await session.close();
  }
}

export async function createUser(user: UserRecord): Promise<void> {
  const session = getSession();
  try {
    await session.run(
      `CREATE (u:User {id: $id, username: $username, passwordHash: $passwordHash, role: $role})`,
      user
    );
  } finally {
    await session.close();
  }
}
