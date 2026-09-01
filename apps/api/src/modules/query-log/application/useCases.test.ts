import { describe, expect, it } from "vitest";
import { QueryLogEntry, Risk } from "@disa/shared-types";
import { summarizeFailure, summarizeResult, SummaryMismatchError } from "../domain/queryLog.js";
import { QueryLogEntryNotFoundError, QueryLogRepository } from "./ports.js";
import { getQueryLogEntry, listQueryLog, recordQuery } from "./useCases.js";

function risk(id: string, severity: Risk["severity"]): Risk {
  return { id, type: "interaction", severity, drugsInvolved: [], summary: id };
}

class InMemoryQueryLogRepository implements QueryLogRepository {
  private entries: QueryLogEntry[] = [];
  createCalls: QueryLogEntry[] = [];

  async create(entry: QueryLogEntry): Promise<QueryLogEntry> {
    this.createCalls.push(entry);
    this.entries.push(entry);
    return entry;
  }
  async list(): Promise<QueryLogEntry[]> {
    return [...this.entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async findById(id: string): Promise<QueryLogEntry | undefined> {
    return this.entries.find((e) => e.id === id);
  }
}

describe("recordQuery use case", () => {
  it("records a successful patient_check query", async () => {
    const queryLog = new InMemoryQueryLogRepository();
    const entry = await recordQuery(
      {
        id: "log-1",
        queryType: "patient_check",
        patientId: "patient-1",
        inputSummary: { patientId: "patient-1" },
        resultSummary: summarizeResult([risk("r1", "severe")]),
        createdAt: "2026-08-17T00:00:00.000Z",
      },
      { queryLog }
    );
    expect(entry.id).toBe("log-1");
    expect(queryLog.createCalls).toHaveLength(1);
  });

  it("records a failed query", async () => {
    const queryLog = new InMemoryQueryLogRepository();
    const entry = await recordQuery(
      {
        id: "log-2",
        queryType: "patient_check",
        patientId: "missing-patient",
        inputSummary: { patientId: "missing-patient" },
        resultSummary: summarizeFailure("No patient with id missing-patient"),
        createdAt: "2026-08-17T00:00:00.000Z",
      },
      { queryLog }
    );
    expect(entry.resultSummary.status).toBe("failed");
  });

  it("rejects and never calls the repository when the summary is internally inconsistent", async () => {
    const queryLog = new InMemoryQueryLogRepository();
    const badSummary = summarizeResult([risk("r1", "severe")]);
    badSummary.totalRisks = 99; // fabricated, doesn't match risks.length

    await expect(
      recordQuery(
        {
          id: "log-3",
          queryType: "ad_hoc",
          inputSummary: { medicationIds: ["drug-1"] },
          resultSummary: badSummary,
          createdAt: "2026-08-17T00:00:00.000Z",
        },
        { queryLog }
      )
    ).rejects.toBeInstanceOf(SummaryMismatchError);
    expect(queryLog.createCalls).toHaveLength(0);
  });
});

describe("listQueryLog / getQueryLogEntry use cases", () => {
  it("lists recorded entries", async () => {
    const queryLog = new InMemoryQueryLogRepository();
    await recordQuery(
      {
        id: "log-1",
        queryType: "ad_hoc",
        inputSummary: { medicationIds: ["drug-1"] },
        resultSummary: summarizeResult([]),
        createdAt: "2026-08-17T00:00:00.000Z",
      },
      { queryLog }
    );
    const entries = await listQueryLog({ queryLog });
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("log-1");
  });

  it("getQueryLogEntry throws QueryLogEntryNotFoundError when missing", async () => {
    const queryLog = new InMemoryQueryLogRepository();
    await expect(getQueryLogEntry("missing", { queryLog })).rejects.toBeInstanceOf(QueryLogEntryNotFoundError);
  });

  it("getQueryLogEntry returns the full stored entry, including the original risks", async () => {
    const queryLog = new InMemoryQueryLogRepository();
    const risks = [risk("r1", "severe"), risk("r2", "minor")];
    await recordQuery(
      {
        id: "log-1",
        queryType: "patient_check",
        patientId: "patient-1",
        inputSummary: { patientId: "patient-1" },
        resultSummary: summarizeResult(risks),
        createdAt: "2026-08-17T00:00:00.000Z",
      },
      { queryLog }
    );
    const entry = await getQueryLogEntry("log-1", { queryLog });
    expect(entry.resultSummary.risks).toEqual(risks);
  });
});
