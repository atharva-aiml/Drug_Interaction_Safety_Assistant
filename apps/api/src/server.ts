import { app } from "./app.js";
import { config } from "./config.js";
import { seedIfEmpty } from "./db/seed.js";

async function start() {
  try {
    await seedIfEmpty();
  } catch (err) {
    // Best-effort: a seed failure (e.g. DB not reachable yet) shouldn't stop the server
    // from starting — the health check / manual `pnpm db:seed` remain the way to diagnose it.
    console.error("Boot-time auto-seed failed (non-fatal):", err);
  }

  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

start();
