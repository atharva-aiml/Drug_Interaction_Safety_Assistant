import { QueryLogEntry } from "@disa/shared-types";
import { assertSummaryConsistent } from "../domain/queryLog.js";
import { QueryLogEntryNotFoundError, QueryLogRepository, RecordQueryInput } from "./ports.js";

/**
 * Called by SD-002 after every risk-check call completes, success or
 * failure (System Architecture SD-008). Never throws on a logging problem
 * being the caller's fault — assertSummaryConsistent is a guard against
 * *this module's own* bug, not user input, so a failure here is a real
 * defect and is allowed to surface.
 */
export async function recordQuery(input: RecordQueryInput, deps: { queryLog: QueryLogRepository }): Promise<QueryLogEntry> {
  assertSummaryConsistent(input.resultSummary);
  return deps.queryLog.create({
    id: input.id,
    queryType: input.queryType,
    patientId: input.patientId,
    inputSummary: input.inputSummary,
    resultSummary: input.resultSummary,
    createdAt: input.createdAt,
  });
}

export async function listQueryLog(deps: { queryLog: QueryLogRepository }): Promise<QueryLogEntry[]> {
  return deps.queryLog.list();
}

export async function getQueryLogEntry(id: string, deps: { queryLog: QueryLogRepository }): Promise<QueryLogEntry> {
  const entry = await deps.queryLog.findById(id);
  if (!entry) {
    throw new QueryLogEntryNotFoundError(id);
  }
  return entry;
}
