import { Router } from "express";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { InteractionValidationError } from "./domain/interaction.js";
import { DrugNotFoundError } from "./application/ports.js";
import { createInteraction } from "./application/useCases.js";
import { Neo4jInteractionRepository } from "./infrastructure/neo4jInteractionRepository.js";
import { Neo4jDrugCatalog } from "./infrastructure/neo4jDrugCatalog.js";

export const interactionRepository = new Neo4jInteractionRepository();
const catalog = new Neo4jDrugCatalog();

export const interactionRouter = Router();
interactionRouter.use(requireAuth);

interactionRouter.post("/", asyncHandler(async (req, res) => {
  const { drugAId, drugBId, severity, riskDescription, tip } = req.body ?? {};
  if (typeof drugAId !== "string" || typeof drugBId !== "string") {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "drugAId and drugBId are required." } });
  }
  try {
    const created = await createInteraction(
      drugAId,
      drugBId,
      severity,
      { interactions: interactionRepository, catalog, newId: () => uuid() },
      typeof riskDescription === "string" ? riskDescription : undefined,
      typeof tip === "string" ? tip : undefined
    );
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof InteractionValidationError) {
      return res.status(400).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err instanceof DrugNotFoundError) {
      return res.status(400).json({ error: { code: "DRUG_NOT_FOUND", message: err.message, details: { missingDrugIds: err.missingDrugIds } } });
    }
    throw err;
  }
}));
