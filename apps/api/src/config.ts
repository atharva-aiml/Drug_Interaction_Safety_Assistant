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

export const config = {
  port: Number(process.env.PORT ?? 4000),
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

