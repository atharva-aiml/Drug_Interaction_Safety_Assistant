import { parse } from "csv-parse/sync";
import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { allergyLinkRepository } from "../allergy-links/allergyLink.routes.js";
import { Neo4jAllergenCatalog, Neo4jDrugCatalog as Neo4jDrugCatalogForAllergyLinks } from "../allergy-links/infrastructure/neo4jCatalogs.js";
import { contraindicationRepository } from "../contraindications/contraindication.routes.js";
import { Neo4jDiseaseCatalog, Neo4jDrugCatalog as Neo4jDrugCatalogForContraindications } from "../contraindications/infrastructure/neo4jCatalogs.js";
import { interactionRepository } from "../interactions/interaction.routes.js";
import { Neo4jDrugCatalog as Neo4jDrugCatalogForInteractions } from "../interactions/infrastructure/neo4jDrugCatalog.js";
import { ImportJobNotFoundError } from "./application/ports.js";
import { getImportJob, processDrugImport, startImportJob } from "./application/useCases.js";
import { Neo4jAllergenImportRepository } from "./infrastructure/neo4jAllergenImportRepository.js";
import { Neo4jDiseaseImportRepository } from "./infrastructure/neo4jDiseaseImportRepository.js";
import { Neo4jDrugImportRepository } from "./infrastructure/neo4jDrugImportRepository.js";
import { Neo4jImportJobRepository } from "./infrastructure/neo4jImportJobRepository.js";
import { v4 as uuid } from "uuid";

const importJobs = new Neo4jImportJobRepository();
const drugImport = new Neo4jDrugImportRepository();
const allergenImport = new Neo4jAllergenImportRepository();
const diseaseImport = new Neo4jDiseaseImportRepository();

// Reuses the real interactions/allergy-links/contraindications repositories and their
// create-use-cases (see riskCheck.routes.ts for the same cross-module wiring precedent)
// rather than writing INTERACTS_WITH/CONTAINS_ALLERGEN/CONTRAINDICATED_FOR edges directly.
const interactionsDeps = { interactions: interactionRepository, catalog: new Neo4jDrugCatalogForInteractions(), newId: () => uuid() };
const allergyLinksDeps = {
  allergyLinks: allergyLinkRepository,
  drugCatalog: new Neo4jDrugCatalogForAllergyLinks(),
  allergenCatalog: new Neo4jAllergenCatalog(),
  newId: () => uuid(),
};
const contraindicationsDeps = {
  contraindications: contraindicationRepository,
  drugCatalog: new Neo4jDrugCatalogForContraindications(),
  diseaseCatalog: new Neo4jDiseaseCatalog(),
  newId: () => uuid(),
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const dataImportRouter = Router();
dataImportRouter.use(requireAuth);

dataImportRouter.post("/", upload.single("file"), asyncHandler(async (req, res) => {
  const entityType = req.body?.entityType;
  if (entityType !== "drug") {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: 'entityType must be "drug" — the only type implemented so far.' },
    });
  }
  if (!req.file) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "A CSV file is required (field name: file)." } });
  }

  let rows: Record<string, string>[];
  try {
    rows = parse(req.file.buffer.toString("utf-8"), { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    return res.status(400).json({
      error: { code: "INVALID_CSV", message: `Could not parse the file as CSV: ${err instanceof Error ? err.message : "unknown error"}` },
    });
  }

  const job = await startImportJob({ importJobs, newId: () => uuid(), now: () => new Date().toISOString() });

  // Detached on purpose (System Architecture §7): the response returns as soon as the
  // job is queued; processing continues in the background and is polled via GET below.
  processDrugImport(job.id, rows, {
    importJobs,
    drugImport,
    allergenImport,
    diseaseImport,
    interactions: interactionsDeps,
    allergyLinks: allergyLinksDeps,
    contraindications: contraindicationsDeps,
    now: () => new Date().toISOString(),
  }).catch((err) => {
    console.error(`Import job ${job.id} failed unexpectedly outside its own error handling:`, err);
  });

  res.status(202).json({ jobId: job.id, status: job.status });
}));

dataImportRouter.get("/:jobId", asyncHandler(async (req, res) => {
  try {
    const job = await getImportJob(req.params.jobId, { importJobs });
    res.status(200).json({
      jobId: job.id,
      status: job.status,
      acceptedCount: job.acceptedCount,
      rejectedCount: job.rejectedCount,
      errors: job.errors,
    });
  } catch (err) {
    if (err instanceof ImportJobNotFoundError) {
      return res.status(404).json({ error: { code: "IMPORT_JOB_NOT_FOUND", message: err.message } });
    }
    throw err;
  }
}));
