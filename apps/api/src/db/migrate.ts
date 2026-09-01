import { getDriver, getSession, closeDriver } from "./neo4jClient.js";

const CONSTRAINTS = [
  "CREATE CONSTRAINT drug_id_unique IF NOT EXISTS FOR (d:Drug) REQUIRE d.id IS UNIQUE",
  "CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
  "CREATE CONSTRAINT user_username_unique IF NOT EXISTS FOR (u:User) REQUIRE u.username IS UNIQUE",
  "CREATE CONSTRAINT patient_id_unique IF NOT EXISTS FOR (p:Patient) REQUIRE p.id IS UNIQUE",
  "CREATE CONSTRAINT allergen_id_unique IF NOT EXISTS FOR (a:Allergen) REQUIRE a.id IS UNIQUE",
  "CREATE CONSTRAINT disease_id_unique IF NOT EXISTS FOR (d:Disease) REQUIRE d.id IS UNIQUE",
  "CREATE CONSTRAINT interaction_id_unique IF NOT EXISTS FOR ()-[r:INTERACTS_WITH]-() REQUIRE r.id IS UNIQUE",
  "CREATE CONSTRAINT allergy_link_id_unique IF NOT EXISTS FOR ()-[r:CONTAINS_ALLERGEN]-() REQUIRE r.id IS UNIQUE",
  "CREATE CONSTRAINT contraindication_id_unique IF NOT EXISTS FOR ()-[r:CONTRAINDICATED_FOR]-() REQUIRE r.id IS UNIQUE",
  "CREATE CONSTRAINT query_log_entry_id_unique IF NOT EXISTS FOR (q:QueryLogEntry) REQUIRE q.id IS UNIQUE",
  "CREATE CONSTRAINT import_job_id_unique IF NOT EXISTS FOR (j:ImportJob) REQUIRE j.id IS UNIQUE",
  "CREATE CONSTRAINT chat_session_id_unique IF NOT EXISTS FOR (s:ChatSession) REQUIRE s.id IS UNIQUE",
  "CREATE CONSTRAINT chat_message_id_unique IF NOT EXISTS FOR (m:ChatMessage) REQUIRE m.id IS UNIQUE",
];

async function migrate() {
  await getDriver().verifyConnectivity();
  const session = getSession();
  try {
    for (const statement of CONSTRAINTS) {
      await session.run(statement);
      console.log(`Applied: ${statement}`);
    }
  } finally {
    await session.close();
  }
  console.log("Migration complete.");
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
