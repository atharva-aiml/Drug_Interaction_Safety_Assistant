import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

/** Parse a comma-separated key list, trimming whitespace and dropping blanks. */
function parseKeys(raw: string): string[] {
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  if (keys.length === 0) {
    throw new Error("GROQ_API_KEYS is set but contains no usable keys");
  }
  return keys;
}

/** Comma-separated list → trimmed, non-empty entries (trailing slashes dropped for origin matching). */
function parseList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter((s) => s.length > 0);
}

export const config = {
  // Cloud Run injects PORT (8080); local dev defaults to 4000.
  port: Number(process.env.PORT ?? 4000),
  // Browser origins allowed to call the API (e.g. the Vercel URL). Unset/empty
  // allows any origin — fine for local dev, set it explicitly in production.
  corsOrigins: parseList(process.env.CORS_ORIGINS),
  // Boot-time seed of an empty catalog. Disable in production (AUTO_SEED=false)
  // and seed once via `pnpm db:seed` instead: several Cloud Run instances
  // cold-starting together against an empty DB could each run the
  // non-idempotent relationship seed and create duplicate edges.
  autoSeed: process.env.AUTO_SEED !== "false",
  neo4jUri: required("NEO4J_URI"),
  neo4jUser: required("NEO4J_USER"),
  neo4jPassword: required("NEO4J_PASSWORD"),
  jwtSecret: required("JWT_SECRET"),
  // Groq (OpenAI-compatible) free-tier keys. Multiple keys can be supplied
  // comma-separated so the adapter can rotate past a rate-limited key — the
  // free tier's per-key request/token limits are the main constraint here.
  groqApiKeys: parseKeys(required("GROQ_API_KEYS")),
  // Free-tier Groq models. gpt-oss-120b is a strong general model for answer
  // composition; override via GROQ_MODEL if the free-tier lineup changes.
  openaiModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
  // Entity extraction is a narrow classification task, not open-ended
  // generation — default it to the smaller/faster gpt-oss-20b.
  openaiExtractionModel: process.env.GROQ_EXTRACTION_MODEL ?? "openai/gpt-oss-20b",
};

