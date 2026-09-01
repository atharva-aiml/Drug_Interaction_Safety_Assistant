import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { allergyLinkRepository } from "../allergy-links/allergyLink.routes.js";
import { contraindicationRepository } from "../contraindications/contraindication.routes.js";
import { interactionRepository } from "../interactions/interaction.routes.js";
import { RiskNotFoundError } from "./application/ports.js";
import { getRiskDetail } from "./application/useCases.js";
import { Neo4jPatientLookup } from "./infrastructure/neo4jPatientLookup.js";

const patients = new Neo4jPatientLookup();

export const riskDetailRouter = Router();
riskDetailRouter.use(requireAuth);

riskDetailRouter.get("/:riskId", asyncHandler(async (req, res) => {
  const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
  try {
    const detail = await getRiskDetail(req.params.riskId, patientId, {
      interactions: interactionRepository,
      allergyLinks: allergyLinkRepository,
      contraindications: contraindicationRepository,
      patients,
    });
    res.status(200).json(detail);
  } catch (err) {
    if (err instanceof RiskNotFoundError) {
      return res.status(404).json({ error: { code: "RISK_NOT_FOUND", message: err.message } });
    }
    throw err;
  }
}));
