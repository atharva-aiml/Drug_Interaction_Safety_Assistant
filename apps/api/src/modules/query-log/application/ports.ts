import { QueryInputSummary, QueryLogEntry, QueryResultSummary, QueryType } from "@disa/shared-types";

export interface QueryLogRepository {
  create(entry: QueryLogEntry): Promise<QueryLogEntry>;
  list(): Promise<QueryLogEntry[]>;
  findById(id: string): Promise<QueryLogEntry | undefined>;
}

export interface RecordQueryInput {
  id: string;
  queryType: QueryType;
  patientId?: string;
  inputSummary: QueryInputSummary;
  resultSummary: QueryResultSummary;
  createdAt: string;
}

export class QueryLogEntryNotFoundError extends Error {
  constructor(id: string) {
    super(`No query log entry with id ${id}`);
  }
}
