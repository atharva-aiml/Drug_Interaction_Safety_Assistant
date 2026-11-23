import cors from "cors";
import express from "express";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "./lib/asyncHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { drugRouter } from "./modules/drugs/drug.routes.js";
import { allergenRouter } from "./modules/allergens/allergen.routes.js";
import { diseaseRouter } from "./modules/diseases/disease.routes.js";
import { patientRouter } from "./modules/patients/patient.routes.js";
import { interactionRouter } from "./modules/interactions/interaction.routes.js";
import { allergyLinkRouter } from "./modules/allergy-links/allergyLink.routes.js";
import { contraindicationRouter } from "./modules/contraindications/contraindication.routes.js";
import { riskCheckRouter } from "./modules/risk-check/riskCheck.routes.js";
import { riskDetailRouter } from "./modules/explanations/riskDetail.routes.js";
import { queryLogRouter } from "./modules/query-log/queryLog.routes.js";
import { dataImportRouter } from "./modules/data-import/dataImport.routes.js";
import { chatSessionRouter } from "./modules/chat-sessions/chatSession.routes.js";
import { prescriptionRouter } from "./modules/prescription/prescription.routes.js";
import { getDriver } from "./db/neo4jClient.js";
import { config } from "./config.js";

export const app = express();

// Cloud Run sits behind Google's front end; trust its X-Forwarded-* headers.
app.set("trust proxy", true);

app.use(
  cors(
    config.corsOrigins.length === 0
      ? undefined
      : {
          origin: (origin, callback) => {
            // No Origin header = non-browser caller (curl, health checks) — CORS doesn't apply.
            callback(null, !origin || config.corsOrigins.includes(origin.replace(/\/+$/, "")));
          },
        }
  )
);
app.use(express.json());

app.get("/api/v1/health", asyncHandler(async (_req, res) => {
  try {
    await getDriver().verifyConnectivity();
    res.status(200).json({ status: "ok", graphDb: "ok" });
  } catch {
    res.status(503).json({ status: "degraded", graphDb: "unreachable" });
  }
}));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/drugs", drugRouter);
app.use("/api/v1/allergens", allergenRouter);
app.use("/api/v1/diseases", diseaseRouter);
app.use("/api/v1/patients", patientRouter);
app.use("/api/v1/interactions", interactionRouter);
app.use("/api/v1/drug-allergens", allergyLinkRouter);
app.use("/api/v1/contraindications", contraindicationRouter);
app.use("/api/v1/risk-check", riskCheckRouter);
app.use("/api/v1/risks", riskDetailRouter);
app.use("/api/v1/query-log", queryLogRouter);
app.use("/api/v1/admin/import", dataImportRouter);
app.use("/api/v1/chat-sessions", chatSessionRouter);
app.use("/api/v1/prescription", prescriptionRouter);

// System Architecture §7: "Unhandled exceptions are logged server-side with a
// correlation ID that is also returned to the client... so a failure reported
// by a user can be traced in logs without exposing internals." This was
// documented but never actually implemented until the V1.0 hardening pass —
// found and fixed here, not just noted.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const correlationId = uuid();
  console.error(`[${correlationId}]`, err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Unexpected server error.", correlationId },
  });
});
