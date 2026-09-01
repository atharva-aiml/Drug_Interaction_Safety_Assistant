import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { config } from "../../config.js";
import { createUser, findUserByUsername, UserRecord } from "./auth.repository.js";

const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export async function register(username: string, password: string): Promise<void> {
  const existing = await findUserByUsername(username);
  if (existing) {
    throw new AuthError("USERNAME_TAKEN", "Username is already registered.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user: UserRecord = { id: uuid(), username, passwordHash, role: "standard" };
  await createUser(user);
}

export async function login(username: string, password: string) {
  const user = await findUserByUsername(username);
  if (!user) {
    throw new AuthError("INVALID_CREDENTIALS", "Invalid username or password.");
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthError("INVALID_CREDENTIALS", "Invalid username or password.");
  }
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: TOKEN_TTL_SECONDS }
  );
  return { token, expiresAt: expiresAt.toISOString(), role: user.role };
}

export interface AuthTokenPayload {
  sub: string;
  username: string;
  role: "standard" | "admin";
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
}
