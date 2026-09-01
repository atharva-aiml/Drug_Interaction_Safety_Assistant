import { Router } from "express";
import { v4 as uuid } from "uuid";

import {
  QueryInputSummary,
  QueryType,
  Risk,
} from "@disa/shared-types";

import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";

import { Neo4jAllergyLinkRepository } from "../allergy-links/infrastructure/neo4jAllergyLinkRepository.js";
import { Neo4jContraindicationRepository } from "../contraindications/infrastructure/neo4jContraindicationRepository.js";
import { Neo4jInteractionRepository } from "../interactions/infrastructure/neo4jInteractionRepository.js";
import { Neo4jReferenceCatalog } from "../patients/infrastructure/neo4jReferenceCatalog.js";

import { recordQuery } from "../query-log/application/useCases.js";
import {
  summarizeFailure,
  summarizeResult,
} from "../query-log/domain/queryLog.js";
import { Neo4jQueryLogRepository } from "../query-log/infrastructure/neo4jQueryLogRepository.js";

import {
  PatientNotFoundError,
  RiskReferenceNotFoundError,
} from "./application/ports.js";
import { checkRisks } from "./application/useCases.js";
import { Neo4jPatientProfileLookup } from "./infrastructure/neo4jPatientProfileLookup.js";

// Instantiate Repositories & Catalogs
const patientProfile = new Neo4jPatientProfileLookup();
const interactionRepository = new Neo4jInteractionRepository();
const allergyLinkRepository = new Neo4jAllergyLinkRepository();
const contraindicationRepository = new Neo4jContraindicationRepository();
const referenceCatalog = new Neo4jReferenceCatalog();
const queryLogRepository = new Neo4jQueryLogRepository();

export const riskCheckRouter = Router();

riskCheckRouter.use(requireAuth);

/**
 * Extracts string array safely from input regardless of whether the frontend
 * sends strings ["Aspirin"] or objects [{ value: "Aspirin" }]
 */
function extractStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const val = obj.value ?? obj.name ?? obj.id ?? obj.label;
        if (typeof val === "string") return val.trim();
      }
      return "";
    })
    .filter(Boolean);
}

async function logQuery(
  queryType: QueryType,
  patientId: string | undefined,
  inputSummary: QueryInputSummary,
  outcome: { risks: Risk[] } | { errorMessage: string }
) {
  try {
    await recordQuery(
      {
        id: uuid(),
        queryType,
        patientId: patientId ?? undefined,
        inputSummary,
        resultSummary:
          "risks" in outcome
            ? summarizeResult(outcome.risks)
            : summarizeFailure(outcome.errorMessage),
        createdAt: new Date().toISOString(),
      },
      { queryLog: queryLogRepository }
    );
  } catch (err) {
    console.error("[RiskCheck Log Error] Failed to record query log:", err);
  }
}

/**
 * POST /risk-check
 */
riskCheckRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const { patientId } = req.body ?? {};

      const rawMedications = extractStringArray(req.body?.medications);
      const rawAllergies = extractStringArray(req.body?.allergies);
      const rawConditions = extractStringArray(req.body?.conditions);

      if (!patientId && rawMedications.length === 0) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Provide either patientId or a non-empty medications list.",
          },
        });
      }

      const queryType: QueryType = patientId ? "patient_check" : "ad_hoc";
      const inputSummary: QueryInputSummary = patientId
        ? { patientId }
        : {
          medicationIds: rawMedications,
          allergyIds: rawAllergies,
          conditionIds: rawConditions,
        };

      // Execute risk check, passing referenceCatalog as `references`
      const risks = await checkRisks(
        {
          patientId: patientId ? String(patientId) : undefined,
          medications: rawMedications,
          allergies: rawAllergies,
          conditions: rawConditions,
        },
        {
          interactions: interactionRepository,
          allergyLinks: allergyLinkRepository,
          contraindications: contraindicationRepository,
          patientProfile,
          references: referenceCatalog,
        }
      );

      await logQuery(queryType, patientId, inputSummary, { risks });

      return res.status(200).json({
        risks: risks ?? [],
        checkedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[POST /risk-check ERROR]:", err);

      if (err instanceof PatientNotFoundError) {
        return res.status(404).json({
          error: {
            code: "PATIENT_NOT_FOUND",
            message: err.message,
          },
        });
      }

      if (err instanceof RiskReferenceNotFoundError) {
        return res.status(400).json({
          error: {
            code: "REFERENCE_NOT_FOUND",
            message: err.message,
          },
        });
      }

      return res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: err.message || "An unexpected error occurred during risk check.",
        },
      });
    }
  })
);