import { Router } from "express";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { AllergyLinkValidationError } from "./domain/allergyLink.js";
import { AllergenNotFoundError, DrugNotFoundError } from "./application/ports.js";
import { createAllergyLink } from "./application/useCases.js";
import { Neo4jAllergyLinkRepository } from "./infrastructure/neo4jAllergyLinkRepository.js";
import { Neo4jAllergenCatalog, Neo4jDrugCatalog } from "./infrastructure/neo4jCatalogs.js";

export const allergyLinkRepository = new Neo4jAllergyLinkRepository();
const drugCatalog = new Neo4jDrugCatalog();
const allergenCatalog = new Neo4jAllergenCatalog();

export const allergyLinkRouter = Router();
allergyLinkRouter.use(requireAuth);

allergyLinkRouter.post("/", asyncHandler(async (req, res) => {
  const { drugId, allergenId, severity } = req.body ?? {};
  if (typeof drugId !== "string" || typeof allergenId !== "string") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "drugId and allergenId are required." } });
  }
  try {
    const created = await createAllergyLink(drugId, allergenId, severity, {
      allergyLinks: allergyLinkRepository,
      drugCatalog,
      allergenCatalog,
      newId: () => uuid(),
    });
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof AllergyLinkValidationError) {
      return res.status(400).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err instanceof DrugNotFoundError) {
      return res.status(400).json({ error: { code: "DRUG_NOT_FOUND", message: err.message, details: { missingDrugIds: err.missingDrugIds } } });
    }
    if (err instanceof AllergenNotFoundError) {
      return res.status(400).json({ error: { code: "ALLERGEN_NOT_FOUND", message: err.message, details: { missingAllergenIds: err.missingAllergenIds } } });
    }
    throw err;
  }
}));
