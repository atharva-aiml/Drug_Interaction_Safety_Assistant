import { closeDriver, getDriver } from "./neo4jClient.js";
import { isCatalogEmpty, seed } from "./seed.js";

async function run() {
  await getDriver().verifyConnectivity();

  const force = process.argv.includes("--force");
  const isEmpty = await isCatalogEmpty();

  if (isEmpty || force) {
    if (force && !isEmpty) {
      console.log("Force flag detected: Clearing database before seeding...");
      const session = (await getDriver()).session();
      try {
        await session.run("MATCH (n) DETACH DELETE n");
      } finally {
        await session.close();
      }
    }
    console.log("Starting seed process...");
    await seed();
  } else {
    console.log("Drug catalog already has data — skipping seed. Use '--force' to re-seed.");
  }
}

run()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());