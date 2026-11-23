import { app } from "./app.js";
import { config } from "./config.js";
import { closeDriver } from "./db/neo4jClient.js";
import { seedIfEmpty } from "./db/seed.js";

async function start() {
  if (config.autoSeed) {
    try {
      await seedIfEmpty();
    } catch (err) {
      // Best-effort: a seed failure (e.g. DB not reachable yet) shouldn't stop the server
      // from starting — the health check / manual `pnpm db:seed` remain the way to diagnose it.
      console.error("Boot-time auto-seed failed (non-fatal):", err);
    }
  }

  // Bind all interfaces explicitly — required inside a container (Cloud Run).
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`API listening on port ${config.port}`);
  });

  // Cloud Run sends SIGTERM before stopping an instance (10s grace period):
  // stop accepting connections and close the Neo4j driver's pool cleanly.
  const shutdown = (signal: string) => {
    console.log(`${signal} received — shutting down`);
    server.close(() => {
      closeDriver().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();
