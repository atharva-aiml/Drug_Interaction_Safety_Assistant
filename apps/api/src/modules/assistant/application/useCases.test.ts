import { describe, expect, it } from "vitest";
import {
  AllergyLink,
  ContraindicationLink,
  DrugInteraction,
  Patient,
  PatientProfileFields,
  PatientSummary,
  QueryLogEntry,
} from "@disa/shared-types";
import { AllergyLinkRepository } from "../../allergy-links/application/ports.js";
import { ContraindicationRepository } from "../../contraindications/application/ports.js";
import { PatientLookupPort, PatientRef } from "../../explanations/application/ports.js";
import { InteractionRepository } from "../../interactions/application/ports.js";
import { PatientRepository, ReferenceCatalogPort } from "../../patients/application/ports.js";
import { QueryLogRepository } from "../../query-log/application/ports.js";
import { AssistantCatalogPort, CatalogEntry, ComposeAnswerInput, ComposeGeneralAnswerInput, ExtractedEntities, LlmPort } from "./ports.js";
import { RunTurnDeps, runTurn } from "./useCases.js";

const ASPIRIN = { id: "drug-aspirin", name: "Aspirin" };
const WARFARIN = { id: "drug-warfarin", name: "Warfarin" };

class FakeCatalog implements AssistantCatalogPort {
  constructor(private drugs: CatalogEntry[] = [], private allergens: CatalogEntry[] = [], private diseases: CatalogEntry[] = []) {}
  async listDrugs() { return this.drugs; }
  async listAllergens() { return this.allergens; }
  async listDiseases() { return this.diseases; }
}

class FakePatientRepository implements PatientRepository {
  constructor(private patients = new Map<string, Patient>()) {}
  updateCalls: { id: string; profile: PatientProfileFields }[] = [];
  async create(): Promise<Patient> { throw new Error("not used in this test"); }
  async findById(id: string): Promise<Patient | undefined> { return this.patients.get(id); }
  async list(): Promise<PatientSummary[]> { throw new Error("not used in this test"); }
  async update(id: string, profile: PatientProfileFields): Promise<Patient> {
    this.updateCalls.push({ id, profile });
    const current = this.patients.get(id)!;
    const updated = { ...current, ...profile };
    this.patients.set(id, updated);
    return updated;
  }
  async softDelete(): Promise<Patient> { throw new Error("not used in this test"); }
  async listDeleted(): Promise<PatientSummary[]> { throw new Error("not used in this test"); }
}

class FakeReferenceCatalog implements ReferenceCatalogPort {
  async existingDrugIds(ids: string[]) { return new Set(ids); }
  async existingAllergenIds(ids: string[]) { return new Set(ids); }
  async existingConditionIds(ids: string[]) { return new Set(ids); }
}

class FakeInteractionRepository implements InteractionRepository {
  constructor(private interactions: DrugInteraction[] = []) {}
  async create(): Promise<DrugInteraction> { throw new Error("not used in this test"); }
  async findAmong(drugIds: string[]): Promise<DrugInteraction[]> {
    const idSet = new Set(drugIds);
    return this.interactions.filter((i) => idSet.has(i.drugA.id) && idSet.has(i.drugB.id));
  }
  async findById(id: string): Promise<DrugInteraction | undefined> { return this.interactions.find((i) => i.id === id); }
  async findInvolving(): Promise<DrugInteraction[]> { return []; }
}

class FakeAllergyLinkRepository implements AllergyLinkRepository {
  async create(): Promise<AllergyLink> { throw new Error("not used in this test"); }
  async findConflicts(): Promise<AllergyLink[]> { return []; }
  async findById(): Promise<AllergyLink | undefined> { return undefined; }
}

class FakeContraindicationRepository implements ContraindicationRepository {
  async create(): Promise<ContraindicationLink> { throw new Error("not used in this test"); }
  async findConflicts(): Promise<ContraindicationLink[]> { return []; }
  async findById(): Promise<ContraindicationLink | undefined> { return undefined; }
}

class FakeExplanationPatients implements PatientLookupPort {
  async findById(): Promise<PatientRef | undefined> { return undefined; }
}

class FakeQueryLogRepository implements QueryLogRepository {
  entries: QueryLogEntry[] = [];
  async create(entry: QueryLogEntry): Promise<QueryLogEntry> { this.entries.push(entry); return entry; }
  async list(): Promise<QueryLogEntry[]> { return this.entries; }
  async findById(): Promise<QueryLogEntry | undefined> { return undefined; }
}

class FakeLlm implements LlmPort {
  composeInputs: ComposeAnswerInput[] = [];
  generalAnswerInputs: ComposeGeneralAnswerInput[] = [];
  extractCallCount = 0;
  extractInputs: { message: string; history?: unknown; signal?: AbortSignal }[] = [];
  constructor(
    private extraction: ExtractedEntities | Error,
    private composedText = "composed answer",
    private generalAnswer: string | Error = "general chat answer"
  ) {}
  async extractEntities(input: { message: string; history?: unknown; signal?: AbortSignal }): Promise<ExtractedEntities> {
    this.extractCallCount += 1;
    this.extractInputs.push(input);
    if (this.extraction instanceof Error) throw this.extraction;
    return this.extraction;
  }
  async composeAnswer(input: ComposeAnswerInput): Promise<string> {
    this.composeInputs.push(input);
    return this.composedText;
  }
  async composeGeneralAnswer(input: ComposeGeneralAnswerInput): Promise<string> {
    this.generalAnswerInputs.push(input);
    if (this.generalAnswer instanceof Error) throw this.generalAnswer;
    return this.generalAnswer;
  }
  // Not exercised by runTurn — only used by chat-sessions' title/history-summary logic (Build Plan V2.3.1/V2.3.2). Trivial stubs to satisfy the interface.
  async generateTitle(): Promise<string> { return "stub title"; }
  async summarizeHistory(): Promise<string> { return "stub summary"; }
}

function entities(overrides: Partial<ExtractedEntities>): ExtractedEntities {
  return {
    medications: [],
    allergies: [],
    conditions: [],
    symptoms: [],
    medicationsDenied: false,
    allergiesDenied: false,
    conditionsDenied: false,
    medicationsRemoved: [],
    allergiesRemoved: [],
    conditionsRemoved: [],
    wantsRiskRecheck: false,
    ...overrides,
  };
}

function basePatient(id: string, fields: Partial<PatientProfileFields> = {}): Patient {
  return {
    id,
    displayName: "Chat session abc123",
    createdAt: "2026-01-01T00:00:00.000Z",
    medicationIds: [],
    allergyIds: [],
    conditionIds: [],
    ...fields,
  };
}

function buildDeps(overrides: Partial<RunTurnDeps> & { llm: LlmPort; patients: PatientRepository }): RunTurnDeps {
  return {
    assistantCatalog: new FakeCatalog([ASPIRIN, WARFARIN]),
    patientCatalog: new FakeReferenceCatalog(),
    interactions: new FakeInteractionRepository(),
    allergyLinks: new FakeAllergyLinkRepository(),
    contraindications: new FakeContraindicationRepository(),
    explanationPatients: new FakeExplanationPatients(),
    queryLog: new FakeQueryLogRepository(),
    newId: (() => { let n = 0; return () => `id-${++n}`; })(),
    now: () => "2026-08-21T00:00:00.000Z",
    ...overrides,
  };
}

/** Convenience: a turn where the gate has already run to completion — isolates conclusion-drawing tests from gating behavior. */
const DONE = { intakeComplete: true, intakeAskCount: 2 };

describe("runTurn — conclusion behavior (intake already complete)", () => {
  it("extracts, resolves, and finds a real grounded interaction risk", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const interactions = new FakeInteractionRepository([
      { id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" },
    ]);
    const llm = new FakeLlm(entities({ medications: ["aspirin", "warfarin"] }));
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn({ patientId: "p1", text: "I am taking aspirin and warfarin, am I at risk?", ...DONE }, deps);

    expect(result.risks).toHaveLength(1);
    expect(result.risks![0].type).toBe("interaction");
    expect(result.text).toBe("composed answer");

    // NFR-008: the LLM's composeAnswer must have received exactly the grounded risk the
    // real checkRisks/getRiskDetail pipeline found — nothing fabricated, nothing dropped.
    expect(llm.composeInputs).toHaveLength(1);
    expect(llm.composeInputs[0].groundedRisks).toHaveLength(1);
    expect(llm.composeInputs[0].groundedRisks[0].risk.id).toBe("int-1");
    expect(llm.composeInputs[0].groundedRisks[0].explanation).toContain("severe");
  });

  it("passes conversation history through to composeAnswer, for phrasing continuity", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const interactions = new FakeInteractionRepository([
      { id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" },
    ]);
    const llm = new FakeLlm(entities({ medications: ["aspirin", "warfarin"] }));
    const deps = buildDeps({ llm, patients, interactions });
    const history = [
      { role: "user" as const, text: "I take aspirin" },
      { role: "assistant" as const, text: "Got it, noted." },
    ];

    await runTurn({ patientId: "p1", text: "I also take warfarin now", history, ...DONE }, deps);

    expect(llm.composeInputs[0].history).toEqual(history);
  });

  it("persists newly-mentioned drugs onto the session's backing patient profile", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ medications: ["aspirin"] }));
    const deps = buildDeps({ llm, patients });

    await runTurn({ patientId: "p1", text: "I take aspirin", ...DONE }, deps);

    expect(patients.updateCalls).toHaveLength(1);
    expect(patients.updateCalls[0].profile.medicationIds).toEqual([ASPIRIN.id]);
  });

  it("surfaces an unresolved name instead of silently dropping or guessing it", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ medications: ["CompletelyMadeUpDrugXyz"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I take CompletelyMadeUpDrugXyz", ...DONE }, deps);

    expect(result.unresolvedNames).toEqual(["CompletelyMadeUpDrugXyz"]);
    expect(result.risks).toBeUndefined();
  });

  it("falls back to a clear message when extraction fails, without ever calling checkRisks (NFR-007)", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(new Error("OpenAI is down"));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I am taking aspirin", ...DONE }, deps);

    expect(result.text).toMatch(/couldn't process/i);
    expect(result.risks).toBeUndefined();
    expect(patients.updateCalls).toHaveLength(0);
  });

  it("falls back to the deterministic grounded template when composeAnswer fails", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const interactions = new FakeInteractionRepository([
      { id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" },
    ]);
    const llm: LlmPort = {
      extractEntities: async () => entities({ medications: ["aspirin", "warfarin"] }),
      composeAnswer: async () => {
        throw new Error("OpenAI composition down");
      },
      composeGeneralAnswer: async () => "unused in this test",
      generateTitle: async () => "unused in this test",
      summarizeHistory: async () => "unused in this test",
    };
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn({ patientId: "p1", text: "aspirin and warfarin?", ...DONE }, deps);

    expect(result.text).toContain("severe interaction");
    expect(result.risks).toHaveLength(1);
  });

  it("leads with the interaction's specific authored risk/tip when present (demo-data enrichment)", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const interactions = new FakeInteractionRepository([
      {
        id: "int-1",
        drugA: ASPIRIN,
        drugB: WARFARIN,
        severity: "severe",
        riskDescription: "Combined blood-thinning effect raises the chance of serious bleeding.",
        tip: "Watch closely for unusual bruising or bleeding.",
      },
    ]);
    const llm = new FakeLlm(entities({ medications: ["aspirin", "warfarin"] }));
    const deps = buildDeps({ llm, patients, interactions });

    await runTurn({ patientId: "p1", text: "aspirin and warfarin?", ...DONE }, deps);

    const grounded = llm.composeInputs[0].groundedRisks[0];
    expect(grounded.explanation).toContain("Combined blood-thinning effect raises the chance of serious bleeding.");
    expect(grounded.tips[0]).toBe("Watch closely for unusual bruising or bleeding.");
  });

  it("returns a positive, non-fabricated message when nothing is flagged", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id] })]]));
    const llm = new FakeLlm(entities({ medications: ["warfarin"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I just started warfarin too", ...DONE }, deps);

    expect(result.risks).toEqual([]);
    expect(llm.composeInputs[0].groundedRisks).toEqual([]);
  });

  it("gives generic, non-diagnostic guidance for a reported symptom once intake is complete but nothing is on record", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ symptoms: ["nose bleeding"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "Still having nose bleeding, nothing else to add", ...DONE }, deps);

    expect(result.text).toContain("nose bleeding");
    expect(result.text.toLowerCase()).toContain("healthcare professional");
    expect(result.risks).toBeUndefined();
    expect(llm.composeInputs).toHaveLength(0);
  });
});

describe("runTurn — intake gate (gather medications/allergies/conditions before any conclusion, retrying for partial answers)", () => {
  it("asks a consolidated intake question on the first substantive message naming only medications — never concludes on partial information", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const interactions = new FakeInteractionRepository([
      { id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" },
    ]);
    const llm = new FakeLlm(entities({ medications: ["aspirin", "warfarin"] }));
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn(
      { patientId: "p1", text: "I am taking aspirin and warfarin, am I exposed to any risks?", intakeComplete: false, intakeAskCount: 0 },
      deps
    );

    // The core of the reported bug: a direct medication question must NOT
    // immediately conclude — it must gather allergies/conditions first.
    expect(result.risks).toBeUndefined();
    expect(llm.composeInputs).toHaveLength(0);
    expect(result.intakeJustCompleted).toBeUndefined();
    expect(result.intakeAskCount).toBe(1);
    expect(result.text.toLowerCase()).toContain("allerg");
    expect(result.text.toLowerCase()).toContain("condition");
    expect(result.text.toLowerCase()).not.toContain("medications you're"); // already known, shouldn't re-ask
  });

  it("re-asks — the exact reported bug — when a reply only answers PART of what was asked, naming only what's still missing", async () => {
    // Session already has aspirin+warfarin known and has been asked once (askCount=1) for
    // allergies + conditions. The user's reply ("no allergies") only addresses allergies.
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id, WARFARIN.id] })]]));
    const llm = new FakeLlm(entities({ allergiesDenied: true }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn(
      { patientId: "p1", text: "No allergies", intakeComplete: false, intakeAskCount: 1 },
      deps
    );

    // Must NOT conclude yet — conditions is still genuinely unanswered.
    expect(result.risks).toBeUndefined();
    expect(result.intakeJustCompleted).toBeUndefined();
    expect(result.intakeAskCount).toBe(2);
    expect(result.text.toLowerCase()).toContain("condition");
    expect(result.text.toLowerCase()).not.toContain("allerg"); // already answered, don't re-ask it
    expect(result.text.toLowerCase()).not.toContain("medication"); // already known from profile
  });

  it("re-asks — a second reported variant of the bug — when a reply POSITIVELY answers one category, leaving another unaddressed", async () => {
    // The exact live-reported scenario: user names a real allergy (a positive answer, not a
    // denial) while conditions goes completely unmentioned. conditionsDenied must stay false —
    // a positive answer to allergies is not evidence conditions is empty.
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id, WARFARIN.id] })]]));
    const llm = new FakeLlm(entities({ allergies: ["penicillin"] })); // allergiesDenied/conditionsDenied both false
    const deps = buildDeps({
      llm,
      patients,
      assistantCatalog: new FakeCatalog([ASPIRIN, WARFARIN], [{ id: "allergen-penicillin", name: "Penicillin" }]),
    });

    const result = await runTurn(
      { patientId: "p1", text: "i have pennicilin allergy", intakeComplete: false, intakeAskCount: 1 },
      deps
    );

    expect(result.risks).toBeUndefined();
    expect(result.intakeJustCompleted).toBeUndefined();
    expect(result.intakeAskCount).toBe(2);
    expect(result.text.toLowerCase()).toContain("condition");
    expect(result.text.toLowerCase()).not.toContain("allerg");
  });

  it("gives up and concludes after the retry cap even if something is still unanswered", async () => {
    // Already asked twice (askCount=2); the user still hasn't addressed conditions.
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id, WARFARIN.id], allergyIds: [] })]]));
    const interactions = new FakeInteractionRepository([
      { id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" },
    ]);
    const llm = new FakeLlm(entities({}));
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn(
      { patientId: "p1", text: "Let's just go ahead", intakeComplete: false, intakeAskCount: 2 },
      deps
    );

    expect(result.intakeJustCompleted).toBe(true);
    expect(result.risks).toHaveLength(1); // concluded for real, using whatever was known
  });

  it("completes immediately, without a second ask, when the very first reply covers everything asked", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ medications: ["aspirin"], allergiesDenied: true, conditionsDenied: true }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn(
      { patientId: "p1", text: "I take aspirin, no allergies or conditions", intakeComplete: false, intakeAskCount: 0 },
      deps
    );

    expect(result.intakeJustCompleted).toBe(true);
    expect(result.intakeAskCount).toBeUndefined();
  });

  it("asks the consolidated question for a bare symptom report too, mentioning all three categories", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ symptoms: ["nose bleeding"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I am facing nose bleeding", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.text).toContain("nose bleeding");
    expect(result.text.toLowerCase()).toContain("medication");
    expect(result.text.toLowerCase()).toContain("allerg");
    expect(result.text.toLowerCase()).toContain("condition");
    expect(result.intakeAskCount).toBe(1);
    expect(result.risks).toBeUndefined();
    expect(llm.composeInputs).toHaveLength(0);
  });

  it("does not spend an intake question on a message with nothing substantive — answers it as general chat instead", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "hello", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.intakeJustCompleted).toBeUndefined();
    expect(result.intakeAskCount).toBeUndefined();
    expect(result.text).toBe("general chat answer");
    expect(llm.generalAnswerInputs).toHaveLength(1);
    expect(llm.generalAnswerInputs[0].userMessage).toBe("hello");
  });

  it("ties the eventual conclusion back to a symptom reported during intake, once everything is confirmed", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id] })]]));
    const interactions = new FakeInteractionRepository([
      { id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" },
    ]);
    const llm = new FakeLlm(entities({ medications: ["warfarin"], symptoms: ["nose bleeding"], allergiesDenied: true, conditionsDenied: true }));
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn(
      { patientId: "p1", text: "Yes, aspirin and warfarin, no allergies or conditions, and I'm having nose bleeding", intakeComplete: false, intakeAskCount: 1 },
      deps
    );

    expect(result.intakeJustCompleted).toBe(true);
    expect(result.risks).toHaveLength(1);
    expect(llm.composeInputs[0].symptoms).toEqual(["nose bleeding"]);
  });
});

describe("runTurn — general chat (nothing substantive to check)", () => {
  it("answers a greeting/general question via composeGeneralAnswer, with history for continuity", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}), "composed answer", "Hi there! Ask me about your medications anytime.");
    const deps = buildDeps({ llm, patients });
    const history = [{ role: "user" as const, text: "hello" }, { role: "assistant" as const, text: "Hi!" }];

    const result = await runTurn(
      { patientId: "p1", text: "how are you?", history, intakeComplete: false, intakeAskCount: 0 },
      deps
    );

    expect(result.text).toBe("Hi there! Ask me about your medications anytime.");
    expect(llm.generalAnswerInputs[0].history).toEqual(history);
  });

  it("falls back to a clear static message if composeGeneralAnswer itself fails (NFR-007)", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}), "composed answer", new Error("OpenAI general chat down"));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "hello", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.text).toMatch(/didn't catch|general question/i);
  });

  it("still prioritizes a genuinely unresolved name over general chat, even on the very first turn", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ medications: ["CompletelyMadeUpDrugXyz"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "CompletelyMadeUpDrugXyz?", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.text).toContain("CompletelyMadeUpDrugXyz");
    expect(result.unresolvedNames).toEqual(["CompletelyMadeUpDrugXyz"]);
    expect(llm.generalAnswerInputs).toHaveLength(0);
  });

  it("answers general chat post-intake too (nothing ever on record, no symptom, no unresolved name)", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}), "composed answer", "Happy to help with anything pharma-related!");
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "thanks for the earlier help", ...DONE }, deps);

    expect(result.text).toBe("Happy to help with anything pharma-related!");
  });
});

describe("runTurn — emergency escalation (improvements.md #1.1, Build Plan V2.1.1, revised per live user report)", () => {
  it("detects the emergency deterministically without depending on the LLM call it also makes", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I can't breathe", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.isEmergency).toBe(true);
    expect(result.emergencyCategory).toBe("breathing difficulty");
    expect(result.text.toLowerCase()).toContain("emergency");
    // detection itself never depends on extraction succeeding — it's computed from the raw text up front, before this call.
    expect(result.risks).toBeUndefined();
  });

  it("also continues the normal flow after the emergency notice — the same turn still asks/answers as it would have on its own", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}), "composed answer", "general chat answer");
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I can't breathe", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.isEmergency).toBe(true);
    // the emergency notice leads, but the normal general-chat reply is appended right after it, not dropped.
    expect(result.text).toContain("general chat answer");
    expect(result.text.indexOf("emergency")).toBeLessThan(result.text.indexOf("general chat answer"));
    expect(llm.extractCallCount).toBe(1);
    expect(llm.generalAnswerInputs).toHaveLength(1);
  });

  it("emergency phrasing mid-intake still asks the normal follow-up intake question afterward", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id] })]]));
    const llm = new FakeLlm(entities({}));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "chest pain right now", intakeComplete: false, intakeAskCount: 1 }, deps);

    expect(result.isEmergency).toBe(true);
    expect(result.intakeAskCount).toBe(2);
    expect(result.pendingClarifications).toEqual([]);
  });

  it("emergency phrasing that also names a real drug still runs the grounded risk check and reports it", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const interactions = new FakeInteractionRepository([
      { id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" },
    ]);
    const llm = new FakeLlm(entities({ medications: ["aspirin", "warfarin"] }));
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn({ patientId: "p1", text: "I took aspirin and warfarin and now I can't breathe", ...DONE }, deps);

    expect(result.isEmergency).toBe(true);
    expect(result.risks).toHaveLength(1);
    expect(result.answerSource).toBe("grounded");
    expect(result.text).toContain("composed answer");
  });

  it("still runs the normal pipeline for an ordinary symptom that isn't an emergency", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ symptoms: ["nose bleeding"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I am facing nose bleeding", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.isEmergency).toBeUndefined();
    expect(llm.extractCallCount).toBe(1);
  });
});

describe("runTurn — answer source (improvements.md #1.6, Build Plan V2.1.3)", () => {
  it("tags a real risk-check conclusion as grounded", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const interactions = new FakeInteractionRepository([{ id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" }]);
    const llm = new FakeLlm(entities({ medications: ["aspirin", "warfarin"] }));
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn({ patientId: "p1", text: "aspirin and warfarin?", ...DONE }, deps);

    expect(result.answerSource).toBe("grounded");
  });

  it("tags a zero-risk conclusion as grounded too — a real check ran, it just found nothing", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id] })]]));
    const llm = new FakeLlm(entities({ medications: ["warfarin"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I just started warfarin too", ...DONE }, deps);

    expect(result.answerSource).toBe("grounded");
    expect(result.risks).toEqual([]);
  });

  it("tags a general-chat reply as general — nothing was checked", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}), "composed answer", "Hi there!");
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "hello", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.answerSource).toBe("general");
  });

  it("leaves answerSource unset for an intake question — it's neither a conclusion nor general chat", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ medications: ["aspirin"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I take aspirin", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.answerSource).toBeUndefined();
  });
});

describe("runTurn — does not re-label an unrelated follow-up as a fresh grounded check (bugfix reported live, V2.1 addendum)", () => {
  it("answers a definitional follow-up as general chat instead of re-running the risk check", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id, WARFARIN.id] })]]));
    const interactions = new FakeInteractionRepository([{ id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" }]);
    const llm = new FakeLlm(entities({}), "composed answer", "Bruising happens when blood vessels under the skin are damaged.");
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn({ patientId: "p1", text: "what is bruising", ...DONE }, deps);

    expect(result.answerSource).toBe("general");
    expect(result.risks).toBeUndefined();
    expect(llm.composeInputs).toHaveLength(0);
    expect(llm.generalAnswerInputs).toHaveLength(1);
  });

  it("still runs the real check when the user explicitly asks about their own risk again", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id, WARFARIN.id] })]]));
    const interactions = new FakeInteractionRepository([{ id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" }]);
    const llm = new FakeLlm(entities({ wantsRiskRecheck: true }));
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn({ patientId: "p1", text: "am I still at risk?", ...DONE }, deps);

    expect(result.answerSource).toBe("grounded");
    expect(result.risks).toHaveLength(1);
  });

  it("still runs the real check when something new is mentioned, with no explicit recheck request needed", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id] })]]));
    const interactions = new FakeInteractionRepository([{ id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" }]);
    const llm = new FakeLlm(entities({ medications: ["warfarin"] }));
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn({ patientId: "p1", text: "I also just started warfarin", ...DONE }, deps);

    expect(result.answerSource).toBe("grounded");
    expect(result.risks).toHaveLength(1);
  });

  it("still runs the real check when forceGroundedCheck is set (Build Plan V2.2.6's regenerate use case)", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id, WARFARIN.id] })]]));
    const interactions = new FakeInteractionRepository([{ id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" }]);
    const llm = new FakeLlm(entities({}));
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn({ patientId: "p1", text: "none", intakeComplete: true, intakeAskCount: 2, forceGroundedCheck: true }, deps);

    expect(result.answerSource).toBe("grounded");
    expect(result.risks).toHaveLength(1);
  });

  it("still runs the real check on the very turn intake completes, even with no explicit recheck request", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id, WARFARIN.id] })]]));
    const interactions = new FakeInteractionRepository([{ id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" }]);
    const llm = new FakeLlm(entities({ allergiesDenied: true, conditionsDenied: true }));
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn({ patientId: "p1", text: "no allergies or conditions", intakeComplete: false, intakeAskCount: 1 }, deps);

    expect(result.intakeJustCompleted).toBe(true);
    expect(result.answerSource).toBe("grounded");
    expect(result.risks).toHaveLength(1);
  });
});

describe("runTurn — fuzzy-match confirmation (improvements.md #1.3, Build Plan V2.1.4)", () => {
  it("asks for confirmation instead of silently accepting a close typo, and does not add it to the profile yet", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ medications: ["Warfarn"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I take Warfarn", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.text).toContain("Warfarin");
    expect(result.text).toContain("Warfarn");
    expect(result.pendingClarifications).toHaveLength(1);
    expect(result.pendingClarifications![0]).toMatchObject({ kind: "confirm", category: "medications", action: "add" });
    expect(patients.updateCalls).toHaveLength(0);
    expect(result.risks).toBeUndefined();
  });

  it("adds the confirmed drug to the profile once the user replies yes on the follow-up turn", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}));
    const deps = buildDeps({ llm, patients });
    const pending = [
      { category: "medications" as const, action: "add" as const, kind: "confirm" as const, queryName: "Warfarn", candidate: { id: WARFARIN.id, name: "Warfarin" } },
    ];

    const result = await runTurn(
      { patientId: "p1", text: "yes", intakeComplete: false, intakeAskCount: 0, pendingClarifications: pending },
      deps
    );

    expect(patients.updateCalls).toHaveLength(1);
    expect(patients.updateCalls[0].profile.medicationIds).toEqual([WARFARIN.id]);
    expect(result.pendingClarifications).toEqual([]);
  });

  it("drops the item with a note when the user declines the confirmation", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}));
    const deps = buildDeps({ llm, patients });
    const pending = [
      { category: "medications" as const, action: "add" as const, kind: "confirm" as const, queryName: "Warfarn", candidate: { id: WARFARIN.id, name: "Warfarin" } },
    ];

    const result = await runTurn(
      { patientId: "p1", text: "no, that's not right", intakeComplete: false, intakeAskCount: 0, pendingClarifications: pending },
      deps
    );

    expect(patients.updateCalls).toHaveLength(0);
    expect(result.text.toLowerCase()).toContain("leave");
    expect(result.pendingClarifications).toEqual([]);
  });
});

describe("runTurn — disambiguation (improvements.md #1.4, Build Plan V2.1.5)", () => {
  const AMOXIN = { id: "drug-amoxin", name: "Amoxin" };
  const AMOXID = { id: "drug-amoxid", name: "Amoxid" };

  it("asks the user to choose between two equally-close candidates rather than guessing", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ medications: ["Amoxil"] }));
    const deps = buildDeps({ llm, patients, assistantCatalog: new FakeCatalog([ASPIRIN, WARFARIN, AMOXIN, AMOXID]) });

    const result = await runTurn({ patientId: "p1", text: "I take Amoxil", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.text).toContain("Amoxin");
    expect(result.text).toContain("Amoxid");
    expect(result.pendingClarifications).toHaveLength(1);
    expect(result.pendingClarifications![0].kind).toBe("disambiguate");
    expect(patients.updateCalls).toHaveLength(0);
  });

  it("resolves to whichever candidate the user names on the follow-up turn", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}));
    const deps = buildDeps({ llm, patients });
    const pending = [
      {
        category: "medications" as const,
        action: "add" as const,
        kind: "disambiguate" as const,
        queryName: "Amoxil",
        candidates: [
          { id: AMOXIN.id, name: "Amoxin" },
          { id: AMOXID.id, name: "Amoxid" },
        ],
      },
    ];

    const result = await runTurn(
      { patientId: "p1", text: "I meant Amoxid", intakeComplete: false, intakeAskCount: 0, pendingClarifications: pending },
      deps
    );

    expect(patients.updateCalls).toHaveLength(1);
    expect(patients.updateCalls[0].profile.medicationIds).toEqual([AMOXID.id]);
    expect(result.pendingClarifications).toEqual([]);
  });
});

describe("runTurn — profile correction / removal (improvements.md #1.8, Build Plan V2.1.7)", () => {
  it("subtracts a resolved 'removed' medication from the accumulated profile", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [ASPIRIN.id, WARFARIN.id] })]]));
    const llm = new FakeLlm(entities({ medicationsRemoved: ["aspirin"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I stopped taking aspirin", ...DONE }, deps);

    expect(patients.updateCalls).toHaveLength(1);
    expect(patients.updateCalls[0].profile.medicationIds).toEqual([WARFARIN.id]);
    // Only warfarin remains — no interaction pair left to flag.
    expect(result.risks).toEqual([]);
  });

  it("asks for confirmation before removing a fuzzy-matched name, same as an addition", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1", { medicationIds: [WARFARIN.id] })]]));
    const llm = new FakeLlm(entities({ medicationsRemoved: ["Warfarn"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn({ patientId: "p1", text: "I stopped taking Warfarn", intakeComplete: false, intakeAskCount: 0 }, deps);

    expect(result.pendingClarifications).toHaveLength(1);
    expect(result.pendingClarifications![0]).toMatchObject({ kind: "confirm", category: "medications", action: "remove" });
    expect(patients.updateCalls).toHaveLength(0);
  });
});

describe("runTurn — one-time limitation disclosures (improvements.md #1.10/#1.11, Build Plan V2.1.9/V2.1.10)", () => {
  it("prefixes a multi-person notice the first time a caregiver phrasing appears, and returns the flag to persist", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ medications: ["aspirin"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn(
      { patientId: "p1", text: "my daughter takes aspirin", intakeComplete: false, intakeAskCount: 0, multiPersonNoticeShown: false },
      deps
    );

    expect(result.text.toLowerCase()).toContain("one person");
    expect(result.multiPersonNoticeShown).toBe(true);
  });

  it("does not repeat the multi-person notice once it's already been shown this session", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ medications: ["aspirin"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn(
      { patientId: "p1", text: "my daughter takes aspirin too", intakeComplete: false, intakeAskCount: 0, multiPersonNoticeShown: true },
      deps
    );

    expect(result.text.toLowerCase()).not.toContain("one person");
    expect(result.multiPersonNoticeShown).toBeUndefined();
  });

  it("prefixes a dosage/frequency notice the first time a dose is mentioned", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ medications: ["aspirin"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn(
      { patientId: "p1", text: "I take 500mg of aspirin", intakeComplete: false, intakeAskCount: 0, dosageNoticeShown: false },
      deps
    );

    expect(result.text.toLowerCase()).toContain("dosage");
    expect(result.dosageNoticeShown).toBe(true);
  });

  it("does not repeat the dosage notice once already shown this session", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({ medications: ["aspirin"] }));
    const deps = buildDeps({ llm, patients });

    const result = await runTurn(
      { patientId: "p1", text: "I take 250mg of aspirin now", intakeComplete: false, intakeAskCount: 0, dosageNoticeShown: true },
      deps
    );

    expect(result.text.toLowerCase()).not.toContain("i don't currently factor");
    expect(result.dosageNoticeShown).toBeUndefined();
  });
});

describe("runTurn — streaming and cancellation (Build Plan V2.2.0/V2.2.7)", () => {
  it("forwards onChunk/signal to composeAnswer for a grounded conclusion", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const interactions = new FakeInteractionRepository([{ id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" }]);
    const llm = new FakeLlm(entities({ medications: ["aspirin", "warfarin"] }));
    const deps = buildDeps({ llm, patients, interactions });
    const chunks: string[] = [];
    const controller = new AbortController();

    await runTurn({ patientId: "p1", text: "aspirin and warfarin?", ...DONE, onChunk: (d) => chunks.push(d), signal: controller.signal }, deps);

    expect(llm.composeInputs[0].onChunk).toBeTypeOf("function");
    expect(llm.composeInputs[0].signal).toBe(controller.signal);
  });

  it("forwards onChunk/signal to composeGeneralAnswer for a general-chat reply", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}));
    const deps = buildDeps({ llm, patients });
    const controller = new AbortController();

    await runTurn({ patientId: "p1", text: "hello", intakeComplete: false, intakeAskCount: 0, onChunk: () => {}, signal: controller.signal }, deps);

    expect(llm.generalAnswerInputs[0].onChunk).toBeTypeOf("function");
    expect(llm.generalAnswerInputs[0].signal).toBe(controller.signal);
  });

  it("forwards signal to extractEntities so a stop request halts the whole turn, not just composition", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const llm = new FakeLlm(entities({}));
    const deps = buildDeps({ llm, patients });
    const controller = new AbortController();

    await runTurn({ patientId: "p1", text: "hello", intakeComplete: false, intakeAskCount: 0, signal: controller.signal }, deps);

    expect(llm.extractInputs[0].signal).toBe(controller.signal);
  });

  it("falls back to the deterministic template — never a truncated answer — when composition is aborted mid-stream", async () => {
    const patients = new FakePatientRepository(new Map([["p1", basePatient("p1")]]));
    const interactions = new FakeInteractionRepository([{ id: "int-1", drugA: ASPIRIN, drugB: WARFARIN, severity: "severe" }]);
    const llm: LlmPort = {
      extractEntities: async () => entities({ medications: ["aspirin", "warfarin"] }),
      composeAnswer: async () => {
        throw new DOMException("The operation was aborted.", "AbortError");
      },
      composeGeneralAnswer: async () => "unused in this test",
      generateTitle: async () => "unused in this test",
      summarizeHistory: async () => "unused in this test",
    };
    const deps = buildDeps({ llm, patients, interactions });

    const result = await runTurn({ patientId: "p1", text: "aspirin and warfarin?", ...DONE }, deps);

    expect(result.text).toContain("severe interaction");
    expect(result.risks).toHaveLength(1);
  });
});
