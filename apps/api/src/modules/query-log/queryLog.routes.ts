import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { QueryLogEntryNotFoundError } from "./application/ports.js";
import { getQueryLogEntry, listQueryLog, recordQuery } from "./application/useCases.js";
import { Neo4jQueryLogRepository } from "./infrastructure/neo4jQueryLogRepository.js";

export const queryLogRepository = new Neo4jQueryLogRepository();
export { recordQuery };

export const queryLogRouter = Router();
queryLogRouter.use(requireAuth);

queryLogRouter.get("/", asyncHandler(async (_req, res) => {
  const entries = await listQueryLog({ queryLog: queryLogRepository });
  res.status(200).json(entries);
}));

queryLogRouter.get("/:id", asyncHandler(async (req, res) => {
  try {
    const entry = await getQueryLogEntry(req.params.id, { queryLog: queryLogRepository });
    res.status(200).json(entry);
  } catch (err) {
    if (err instanceof QueryLogEntryNotFoundError) {
      return res.status(404).json({ error: { code: "QUERY_LOG_ENTRY_NOT_FOUND", message: err.message } });
    }
    throw err;
  }
}));
