import { Router } from "express";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { ContraindicationValidationError } from "./domain/contraindicationLink.js";
import { DiseaseNotFoundError, DrugNotFoundError } from "./application/ports.js";
import { createContraindication } from "./application/useCases.js";
import { Neo4jContraindicationRepository } from "./infrastructure/neo4jContraindicationRepository.js";
import { Neo4jDiseaseCatalog, Neo4jDrugCatalog } from "./infrastructure/neo4jCatalogs.js";

export const contraindicationRepository = new Neo4jContraindicationRepository();
const drugCatalog = new Neo4jDrugCatalog();
const diseaseCatalog = new Neo4jDiseaseCatalog();

export const contraindicationRouter = Router();
contraindicationRouter.use(requireAuth);

contraindicationRouter.post("/", asyncHandler(async (req, res) => {
  const { drugId, diseaseId, severity } = req.body ?? {};
  if (typeof drugId !== "string" || typeof diseaseId !== "string") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "drugId and diseaseId are required." } });
  }
  try {
    const created = await createContraindication(drugId, diseaseId, severity, {
      contraindications: contraindicationRepository,
      drugCatalog,
      diseaseCatalog,
      newId: () => uuid(),
    });
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof ContraindicationValidationError) {
      return res.status(400).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err instanceof DrugNotFoundError) {
      return res.status(400).json({ error: { code: "DRUG_NOT_FOUND", message: err.message, details: { missingDrugIds: err.missingDrugIds } } });
    }
    if (err instanceof DiseaseNotFoundError) {
      return res.status(400).json({ error: { code: "CONDITION_NOT_FOUND", message: err.message, details: { missingDiseaseIds: err.missingDiseaseIds } } });
    }
    throw err;
  }
}));
