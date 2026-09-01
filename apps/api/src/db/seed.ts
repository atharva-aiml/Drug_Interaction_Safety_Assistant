import { v4 as uuid } from "uuid";
import { createAllergyLink } from "../modules/allergy-links/application/useCases.js";
import { Neo4jAllergenCatalog, Neo4jDrugCatalog as Neo4jDrugCatalogForAllergyLinks } from "../modules/allergy-links/infrastructure/neo4jCatalogs.js";
import { Neo4jAllergyLinkRepository } from "../modules/allergy-links/infrastructure/neo4jAllergyLinkRepository.js";
import { createContraindication } from "../modules/contraindications/application/useCases.js";
import { Neo4jDiseaseCatalog, Neo4jDrugCatalog as Neo4jDrugCatalogForContraindications } from "../modules/contraindications/infrastructure/neo4jCatalogs.js";
import { Neo4jContraindicationRepository } from "../modules/contraindications/infrastructure/neo4jContraindicationRepository.js";
import { Neo4jAllergenImportRepository } from "../modules/data-import/infrastructure/neo4jAllergenImportRepository.js";
import { Neo4jDiseaseImportRepository } from "../modules/data-import/infrastructure/neo4jDiseaseImportRepository.js";
import { Neo4jDrugImportRepository } from "../modules/data-import/infrastructure/neo4jDrugImportRepository.js";
import { createInteraction } from "../modules/interactions/application/useCases.js";
import { Neo4jDrugCatalog as Neo4jDrugCatalogForInteractions } from "../modules/interactions/infrastructure/neo4jDrugCatalog.js";
import { Neo4jInteractionRepository } from "../modules/interactions/infrastructure/neo4jInteractionRepository.js";
import { getSession } from "./neo4jClient.js";
import {
  SEED_ALLERGENS,
  SEED_ALLERGY_LINKS,
  SEED_CONTRAINDICATIONS,
  SEED_DISEASES,
  SEED_DRUGS,
  SEED_INTERACTIONS,
} from "./seedData.js";

const drugImport = new Neo4jDrugImportRepository();
const allergenImport = new Neo4jAllergenImportRepository();
const diseaseImport = new Neo4jDiseaseImportRepository();

const interactionsDeps = { interactions: new Neo4jInteractionRepository(), catalog: new Neo4jDrugCatalogForInteractions(), newId: () => uuid() };
const allergyLinksDeps = {
  allergyLinks: new Neo4jAllergyLinkRepository(),
  drugCatalog: new Neo4jDrugCatalogForAllergyLinks(),
  allergenCatalog: new Neo4jAllergenCatalog(),
  newId: () => uuid(),
};
const contraindicationsDeps = {
  contraindications: new Neo4jContraindicationRepository(),
  drugCatalog: new Neo4jDrugCatalogForContraindications(),
  diseaseCatalog: new Neo4jDiseaseCatalog(),
  newId: () => uuid(),
};

/**
 * Reuses SD-006's own MERGE-by-name repositories (data-import module) and
 * each risk-type module's own `create*` use case — same cross-module
 * composition precedent as `dataImport.routes.ts`'s CSV pipeline — rather
 * than writing a second, parallel Cypher path for seed data.
 *
 * Idempotent for entities (MERGE by name) but NOT for relationships: running
 * this against an already-seeded database would create duplicate
 * INTERACTS_WITH/etc. edges. That's fine — `isCatalogEmpty` gates both the
 * CLI script and the server-boot auto-seed so this only ever runs once
 * against a genuinely empty Drug catalog.
 */
export async function isCatalogEmpty(): Promise<boolean> {
  const session = getSession();
  try {
    const result = await session.run("MATCH (d:Drug) RETURN count(d) AS count");
    return result.records[0].get("count").toNumber() === 0;
  } finally {
    await session.close();
  }
}

export async function seed(): Promise<void> {
  const drugIdByName = new Map<string, string>();
  for (const drug of SEED_DRUGS) {
    const created = await drugImport.create(drug);
    drugIdByName.set(created.name, created.id);
  }

  const allergenIdByName = new Map<string, string>();
  for (const name of SEED_ALLERGENS) {
    const created = await allergenImport.findOrCreateByName(name);
    allergenIdByName.set(created.name, created.id);
  }

  const diseaseIdByName = new Map<string, string>();
  for (const name of SEED_DISEASES) {
    const created = await diseaseImport.findOrCreateByName(name);
    diseaseIdByName.set(created.name, created.id);
  }

  for (const { drugName, targetName, severity } of SEED_INTERACTIONS) {
    await createInteraction(drugIdByName.get(drugName)!, drugIdByName.get(targetName)!, severity, interactionsDeps);
  }
  for (const { drugName, targetName, severity } of SEED_ALLERGY_LINKS) {
    await createAllergyLink(drugIdByName.get(drugName)!, allergenIdByName.get(targetName)!, severity, allergyLinksDeps);
  }
  for (const { drugName, targetName, severity } of SEED_CONTRAINDICATIONS) {
    await createContraindication(drugIdByName.get(drugName)!, diseaseIdByName.get(targetName)!, severity, contraindicationsDeps);
  }

  console.log(
    `Seeded ${SEED_DRUGS.length} drugs, ${SEED_ALLERGENS.length} allergens, ${SEED_DISEASES.length} diseases, ` +
      `${SEED_INTERACTIONS.length} interactions, ${SEED_ALLERGY_LINKS.length} allergy links, ${SEED_CONTRAINDICATIONS.length} contraindications.`
  );
}

/**
 * Seeds only if the Drug catalog is empty; no-op (with a log line) otherwise.
 * Called both from the `pnpm db:seed` CLI entrypoint (`runSeed.ts`) and from
 * `server.ts`'s boot-time auto-seed.
 */
export async function seedIfEmpty(): Promise<void> {
  if (!(await isCatalogEmpty())) {
    console.log("Drug catalog already has data — skipping seed. (Seed is not safe to re-run against existing data; see seed() doc comment.)");
    return;
  }
  await seed();
}
