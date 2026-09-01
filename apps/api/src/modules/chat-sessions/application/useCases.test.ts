import { describe, expect, it } from "vitest";
import { ChatMessage, Patient, PatientProfileFields, PatientSummary } from "@disa/shared-types";
import { PatientRepository, ReferenceCatalogPort } from "../../patients/application/ports.js";
import { PendingClarification } from "../../assistant/domain/clarificationGuidance.js";
import { ChatSessionDeps, createSession, editMessage, getSession, postMessage, regenerateLastMessage, renameSession, setSessionPinned, switchMessageBranch } from "./useCases.js";
import { MessageNotFoundError, NotEditableMessageError, NothingToRegenerateError } from "../domain/chatSession.js";
import { ChatSessionRecord, ChatSessionRepository, HistorySummarizer, TitleGenerator, TurnAnswerer, TurnResult } from "./ports.js";

class FakePatientRepository implements PatientRepository {
  patients = new Map<string, Patient>();
  async create(id: string, profile: PatientProfileFields, createdAt: string): Promise<Patient> {
    const patient: Patient = { id, ...profile, createdAt };
    this.patients.set(id, patient);
    return patient;
  }
  async findById(id: string): Promise<Patient | undefined> { return this.patients.get(id); }
  async list(): Promise<PatientSummary[]> { throw new Error("not used in this test"); }
  async update(): Promise<Patient> { throw new Error("not used in this test"); }
  async softDelete(): Promise<Patient> { throw new Error("not used in this test"); }
  async listDeleted(): Promise<PatientSummary[]> { throw new Error("not used in this test"); }
}

class FakeReferenceCatalog implements ReferenceCatalogPort {
  async existingDrugIds(ids: string[]) { return new Set(ids); }
  async existingAllergenIds(ids: string[]) { return new Set(ids); }
  async existingConditionIds(ids: string[]) { return new Set(ids); }
}

class FakeChatSessionRepository implements ChatSessionRepository {
  sessions = new Map<string, ChatSessionRecord>();
  messages: (ChatMessage & { activeChildId?: string })[] = [];
  setIntakeCompleteCalls: string[] = [];
  setIntakeAskCountCalls: { id: string; count: number }[] = [];
  setPendingClarificationsCalls: { id: string; pending: PendingClarification[] }[] = [];
  setMultiPersonNoticeShownCalls: string[] = [];
  setDosageNoticeShownCalls: string[] = [];
  setHistorySummaryCalls: { id: string; summary: string; summarizedCount: number }[] = [];

  async create(session: ChatSessionRecord): Promise<ChatSessionRecord> {
    this.sessions.set(session.id, session);
    return session;
  }
  async listByUser(userId: string): Promise<ChatSessionRecord[]> {
    return [...this.sessions.values()].filter((s) => s.userId === userId);
  }
  async findById(id: string): Promise<ChatSessionRecord | undefined> { return this.sessions.get(id); }
  async updateTitle(id: string, title: string): Promise<void> {
    const s = this.sessions.get(id)!;
    this.sessions.set(id, { ...s, title });
  }
  async setPinned(id: string, pinned: boolean): Promise<void> {
    const s = this.sessions.get(id)!;
    this.sessions.set(id, { ...s, pinned });
  }
  async setIntakeComplete(id: string): Promise<void> {
    this.setIntakeCompleteCalls.push(id);
    const s = this.sessions.get(id)!;
    this.sessions.set(id, { ...s, intakeComplete: true });
  }
  async setIntakeAskCount(id: string, count: number): Promise<void> {
    this.setIntakeAskCountCalls.push({ id, count });
    const s = this.sessions.get(id)!;
    this.sessions.set(id, { ...s, intakeAskCount: count });
  }
  async setPendingClarifications(id: string, pending: PendingClarification[]): Promise<void> {
    this.setPendingClarificationsCalls.push({ id, pending });
    const s = this.sessions.get(id)!;
    this.sessions.set(id, { ...s, pendingClarifications: pending });
  }
  async setMultiPersonNoticeShown(id: string): Promise<void> {
    this.setMultiPersonNoticeShownCalls.push(id);
    const s = this.sessions.get(id)!;
    this.sessions.set(id, { ...s, multiPersonNoticeShown: true });
  }
  async setDosageNoticeShown(id: string): Promise<void> {
    this.setDosageNoticeShownCalls.push(id);
    const s = this.sessions.get(id)!;
    this.sessions.set(id, { ...s, dosageNoticeShown: true });
  }
  async appendMessage(message: ChatMessage): Promise<ChatMessage> {
    this.messages.push(message);
    return message;
  }
  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.messages.filter((m) => m.sessionId === sessionId);
  }
  async findMessageById(id: string): Promise<ChatMessage | undefined> {
    return this.messages.find((m) => m.id === id);
  }
  async setActiveFirstMessage(sessionId: string, messageId: string): Promise<void> {
    const s = this.sessions.get(sessionId)!;
    this.sessions.set(sessionId, { ...s, activeFirstMessageId: messageId });
  }
  async setActiveChildId(messageId: string, childId: string): Promise<void> {
    this.messages = this.messages.map((m) => (m.id === messageId ? { ...m, activeChildId: childId } : m));
  }
  async deleteMessage(id: string): Promise<void> {
    this.messages = this.messages.filter((m) => m.id !== id);
  }
  async setHistorySummary(id: string, summary: string, summarizedCount: number): Promise<void> {
    this.setHistorySummaryCalls.push({ id, summary, summarizedCount });
    const s = this.sessions.get(id)!;
    this.sessions.set(id, { ...s, historySummary: summary, historySummarizedCount: summarizedCount });
  }
  async delete(id: string): Promise<void> { this.sessions.delete(id); }
}

class FakeTitleGenerator implements TitleGenerator {
  calls: string[] = [];
  constructor(private result: string | Error = "A Generated Title") {}
  async generateTitle(userMessage: string): Promise<string> {
    this.calls.push(userMessage);
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

class FakeHistorySummarizer implements HistorySummarizer {
  calls: { existingSummary: string; olderMessages: { role: ChatMessage["role"]; text: string }[] }[] = [];
  constructor(private result: string | Error = "A summary of earlier messages.") {}
  async summarize(existingSummary: string, olderMessages: { role: ChatMessage["role"]; text: string }[]): Promise<string> {
    this.calls.push({ existingSummary, olderMessages });
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

class FakeTurnAnswerer implements TurnAnswerer {
  lastInput?: Parameters<TurnAnswerer["answer"]>[0];
  constructor(private result: TurnResult) {}
  async answer(input: Parameters<TurnAnswerer["answer"]>[0]): Promise<TurnResult> {
    this.lastInput = input;
    return this.result;
  }
}

function buildDeps(overrides: Partial<ChatSessionDeps> & { turnAnswerer: TurnAnswerer }): ChatSessionDeps & { chatSessions: FakeChatSessionRepository } {
  const chatSessions = (overrides.chatSessions as FakeChatSessionRepository | undefined) ?? new FakeChatSessionRepository();
  return {
    patients: new FakePatientRepository(),
    catalog: new FakeReferenceCatalog(),
    titleGenerator: new FakeTitleGenerator(),
    historySummarizer: new FakeHistorySummarizer(),
    newId: (() => { let n = 0; return () => `id-${++n}`; })(),
    now: () => "2026-08-22T00:00:00.000Z",
    ...overrides,
    chatSessions,
  };
}

describe("createSession", () => {
  it("initializes cross-turn state to empty/false, ready for the first turn", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });

    const session = await createSession("user-1", deps);

    expect(session.intakeComplete).toBe(false);
    expect(session.intakeAskCount).toBe(0);
    expect(session.pendingClarifications).toEqual([]);
    expect(session.multiPersonNoticeShown).toBe(false);
    expect(session.dosageNoticeShown).toBe(false);
    expect(session.pinned).toBe(false);
  });
});

describe("setSessionPinned", () => {
  it("pins and unpins a session the user owns", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });
    const session = await createSession("user-1", deps);

    await setSessionPinned(session.id, "user-1", true, deps);
    expect(deps.chatSessions.sessions.get(session.id)?.pinned).toBe(true);

    await setSessionPinned(session.id, "user-1", false, deps);
    expect(deps.chatSessions.sessions.get(session.id)?.pinned).toBe(false);
  });

  it("throws for a session the user does not own", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });
    const session = await createSession("owner", deps);

    await expect(setSessionPinned(session.id, "someone-else", true, deps)).rejects.toThrow();
  });
});

describe("postMessage — cross-turn state passthrough (Build Plan V2.1.4/V2.1.5/V2.1.9/V2.1.10)", () => {
  async function seedSession(deps: ChatSessionDeps & { chatSessions: FakeChatSessionRepository }, overrides: Partial<ChatSessionRecord> = {}) {
    const session = await createSession("user-1", deps);
    const updated: ChatSessionRecord = { ...session, ...overrides };
    deps.chatSessions.sessions.set(session.id, updated);
    return updated;
  }

  it("passes the session's stored pendingClarifications/notice flags into the answerer", async () => {
    const pending: PendingClarification[] = [
      { category: "medications", action: "add", kind: "confirm", queryName: "Warfarn", candidate: { id: "d1", name: "Warfarin" } },
    ];
    const answerer = new FakeTurnAnswerer({ text: "ok" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSession(deps, { pendingClarifications: pending, multiPersonNoticeShown: true, dosageNoticeShown: true });

    await postMessage(session.id, "user-1", "yes", deps);

    expect(answerer.lastInput?.pendingClarifications).toEqual(pending);
    expect(answerer.lastInput?.multiPersonNoticeShown).toBe(true);
    expect(answerer.lastInput?.dosageNoticeShown).toBe(true);
  });

  it("persists a returned pendingClarifications array (including an explicit empty array) back onto the session", async () => {
    const answerer = new FakeTurnAnswerer({ text: "ok", pendingClarifications: [] });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSession(deps);

    await postMessage(session.id, "user-1", "hello", deps);

    expect(deps.chatSessions.setPendingClarificationsCalls).toEqual([{ id: session.id, pending: [] }]);
  });

  it("does not touch persisted pendingClarifications when the turn result omits the field", async () => {
    const answerer = new FakeTurnAnswerer({ text: "sorry, couldn't process that" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSession(deps);

    await postMessage(session.id, "user-1", "hello", deps);

    expect(deps.chatSessions.setPendingClarificationsCalls).toHaveLength(0);
  });

  it("persists the one-time notice flags only when the turn actually raises them", async () => {
    const answerer = new FakeTurnAnswerer({ text: "note added", multiPersonNoticeShown: true });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSession(deps);

    await postMessage(session.id, "user-1", "my daughter takes aspirin", deps);

    expect(deps.chatSessions.setMultiPersonNoticeShownCalls).toEqual([session.id]);
    expect(deps.chatSessions.setDosageNoticeShownCalls).toHaveLength(0);
  });

  it("stores isEmergency/emergencyCategory/answerSource on the persisted assistant message", async () => {
    const answerer = new FakeTurnAnswerer({ text: "emergency text", isEmergency: true, emergencyCategory: "chest pain" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSession(deps);

    const { assistantMessage } = await postMessage(session.id, "user-1", "chest pain", deps);

    expect(assistantMessage.isEmergency).toBe(true);
    expect(assistantMessage.emergencyCategory).toBe("chest pain");
  });

  it("stores answerSource on the persisted assistant message", async () => {
    const answerer = new FakeTurnAnswerer({ text: "grounded answer", answerSource: "grounded" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSession(deps);

    const { assistantMessage } = await postMessage(session.id, "user-1", "aspirin and warfarin?", deps);

    expect(assistantMessage.answerSource).toBe("grounded");
  });
});

async function seedSessionWithMessages(deps: ChatSessionDeps & { chatSessions: FakeChatSessionRepository }, texts: { role: "user" | "assistant"; text: string }[]) {
  const session = await createSession("user-1", deps);
  let parentId: string | undefined;
  for (const [i, m] of texts.entries()) {
    const id = `seed-${i}`;
    await deps.chatSessions.appendMessage({ id, sessionId: session.id, role: m.role, text: m.text, createdAt: `2026-08-22T00:0${i}:00.000Z`, parentId });
    parentId = id;
  }
  return session;
}

describe("regenerateLastMessage (improvements.md #2.7, Build Plan V2.2.6)", () => {
  it("throws when the session has no assistant reply yet to regenerate", async () => {
    const answerer = new FakeTurnAnswerer({ text: "n/a" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSessionWithMessages(deps, [{ role: "user", text: "hi" }]);

    await expect(regenerateLastMessage(session.id, "user-1", deps)).rejects.toThrow(NothingToRegenerateError);
  });

  it("deletes the stale assistant message and replaces it with a fresh one from the answerer", async () => {
    const answerer = new FakeTurnAnswerer({ text: "a better phrasing", answerSource: "grounded" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "aspirin and warfarin?" },
      { role: "assistant", text: "the original, clunky answer" },
    ]);

    const { assistantMessage } = await regenerateLastMessage(session.id, "user-1", deps);

    expect(assistantMessage.text).toBe("a better phrasing");
    expect(assistantMessage.answerSource).toBe("grounded");
    const remaining = await deps.chatSessions.listMessages(session.id);
    expect(remaining.map((m) => m.text)).toEqual(["aspirin and warfarin?", "a better phrasing"]);
  });

  it("re-answers using the original user message's text and the history before it", async () => {
    const answerer = new FakeTurnAnswerer({ text: "regenerated" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "hi" },
      { role: "assistant", text: "hello" },
      { role: "user", text: "aspirin and warfarin?" },
      { role: "assistant", text: "the original answer" },
    ]);

    await regenerateLastMessage(session.id, "user-1", deps);

    expect(answerer.lastInput?.text).toBe("aspirin and warfarin?");
    expect(answerer.lastInput?.history).toEqual([{ role: "user", text: "hi" }, { role: "assistant", text: "hello" }]);
  });

  it("forces the grounded check when the stale message was itself a grounded conclusion (bugfix, V2.2.6)", async () => {
    const answerer = new FakeTurnAnswerer({ text: "a re-phrased conclusion", answerSource: "grounded" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "aspirin and warfarin?" },
      { role: "assistant", text: "the original grounded answer" },
    ]);
    // Mark the stale message as having been a grounded conclusion, the way a real turn would.
    const messages = await deps.chatSessions.listMessages(session.id);
    messages[messages.length - 1].answerSource = "grounded";

    await regenerateLastMessage(session.id, "user-1", deps);

    expect(answerer.lastInput?.forceGroundedCheck).toBe(true);
  });

  it("does not force the grounded check when the stale message was general chat", async () => {
    const answerer = new FakeTurnAnswerer({ text: "a re-phrased general answer", answerSource: "general" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "hello" },
      { role: "assistant", text: "hi there" },
    ]);

    await regenerateLastMessage(session.id, "user-1", deps);

    expect(answerer.lastInput?.forceGroundedCheck).toBe(false);
  });

  it("applies the same cross-turn side effects as a normal turn", async () => {
    const answerer = new FakeTurnAnswerer({ text: "regenerated", pendingClarifications: [] });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "aspirin and warfarin?" },
      { role: "assistant", text: "the original answer" },
    ]);

    await regenerateLastMessage(session.id, "user-1", deps);

    expect(deps.chatSessions.setPendingClarificationsCalls).toEqual([{ id: session.id, pending: [] }]);
  });
});

describe("streaming hooks (Build Plan V2.2.0/V2.2.7)", () => {
  it("postMessage fires onUserMessage as soon as the user's message is persisted, and forwards onChunk/signal to the answerer", async () => {
    const answerer = new FakeTurnAnswerer({ text: "ok" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await createSession("user-1", deps);
    const controller = new AbortController();
    const chunks: string[] = [];
    let userMessageSeen: string | undefined;

    await postMessage(session.id, "user-1", "hello", deps, {
      onUserMessage: (m) => { userMessageSeen = m.text; },
      onChunk: (d) => chunks.push(d),
      signal: controller.signal,
    });

    expect(userMessageSeen).toBe("hello");
    expect(answerer.lastInput?.onChunk).toBeTypeOf("function");
    expect(answerer.lastInput?.signal).toBe(controller.signal);
  });

  it("postMessage works with no hooks at all (regular non-streaming callers unaffected)", async () => {
    const answerer = new FakeTurnAnswerer({ text: "ok" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await createSession("user-1", deps);

    const { userMessage, assistantMessage } = await postMessage(session.id, "user-1", "hello", deps);

    expect(userMessage.text).toBe("hello");
    expect(assistantMessage.text).toBe("ok");
  });

  it("regenerateLastMessage forwards onChunk/signal to the answerer", async () => {
    const answerer = new FakeTurnAnswerer({ text: "regenerated" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "aspirin and warfarin?" },
      { role: "assistant", text: "the original answer" },
    ]);
    const controller = new AbortController();

    await regenerateLastMessage(session.id, "user-1", deps, { onChunk: () => {}, signal: controller.signal });

    expect(answerer.lastInput?.onChunk).toBeTypeOf("function");
    expect(answerer.lastInput?.signal).toBe(controller.signal);
  });
});

describe("LLM-generated titles (improvements.md #3.2, Build Plan V2.3.1)", () => {
  it("uses the LLM-generated title on the session's first message", async () => {
    const answerer = new FakeTurnAnswerer({ text: "ok" });
    const titleGenerator = new FakeTitleGenerator("Aspirin and Warfarin Interaction");
    const deps = buildDeps({ turnAnswerer: answerer, titleGenerator });
    const session = await createSession("user-1", deps);

    await postMessage(session.id, "user-1", "I am taking aspirin and warfarin", deps);

    expect(titleGenerator.calls).toEqual(["I am taking aspirin and warfarin"]);
    expect(deps.chatSessions.sessions.get(session.id)?.title).toBe("Aspirin and Warfarin Interaction");
  });

  it("falls back to the deterministic truncated title when generation fails (NFR-007)", async () => {
    const answerer = new FakeTurnAnswerer({ text: "ok" });
    const titleGenerator = new FakeTitleGenerator(new Error("OpenAI down"));
    const deps = buildDeps({ turnAnswerer: answerer, titleGenerator });
    const session = await createSession("user-1", deps);

    await postMessage(session.id, "user-1", "hello there", deps);

    expect(deps.chatSessions.sessions.get(session.id)?.title).toBe("hello there");
  });

  it("never regenerates the title after the first message (same one-time gate as before)", async () => {
    const answerer = new FakeTurnAnswerer({ text: "ok" });
    const titleGenerator = new FakeTitleGenerator("First Title");
    const deps = buildDeps({ turnAnswerer: answerer, titleGenerator });
    const session = await createSession("user-1", deps);

    await postMessage(session.id, "user-1", "first message", deps);
    await postMessage(session.id, "user-1", "second message", deps);

    expect(titleGenerator.calls).toHaveLength(1);
  });
});

describe("history summarization beyond the context window (improvements.md #3.3, Build Plan V2.3.2)", () => {
  async function seedLongSession(deps: ChatSessionDeps & { chatSessions: FakeChatSessionRepository }, messageCount: number) {
    const texts = Array.from({ length: messageCount }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      text: `message ${i}`,
    }));
    return seedSessionWithMessages(deps, texts);
  }

  it("does not summarize when the conversation is within the 10-turn window", async () => {
    const answerer = new FakeTurnAnswerer({ text: "ok" });
    const historySummarizer = new FakeHistorySummarizer();
    const deps = buildDeps({ turnAnswerer: answerer, historySummarizer });
    const session = await seedLongSession(deps, 8);

    await postMessage(session.id, "user-1", "one more", deps);

    expect(historySummarizer.calls).toHaveLength(0);
    expect(answerer.lastInput?.history).toHaveLength(8);
  });

  it("summarizes the overflow once the window is exceeded and prepends it to history", async () => {
    const answerer = new FakeTurnAnswerer({ text: "ok" });
    const historySummarizer = new FakeHistorySummarizer("Earlier: aspirin and warfarin were discussed.");
    const deps = buildDeps({ turnAnswerer: answerer, historySummarizer });
    const session = await seedLongSession(deps, 13); // 3 over the 10-message window

    await postMessage(session.id, "user-1", "still there?", deps);

    expect(historySummarizer.calls).toHaveLength(1);
    expect(historySummarizer.calls[0].olderMessages).toHaveLength(3);
    expect(deps.chatSessions.setHistorySummaryCalls).toEqual([{ id: session.id, summary: "Earlier: aspirin and warfarin were discussed.", summarizedCount: 3 }]);
    expect(answerer.lastInput?.history?.[0]).toEqual({ role: "assistant", text: "Summary of earlier conversation: Earlier: aspirin and warfarin were discussed." });
    expect(answerer.lastInput?.history).toHaveLength(11); // 1 summary turn + 10 recent
  });

  it("does not re-summarize messages already covered by a prior summary", async () => {
    const answerer = new FakeTurnAnswerer({ text: "ok" });
    const historySummarizer = new FakeHistorySummarizer("updated summary");
    const deps = buildDeps({ turnAnswerer: answerer, historySummarizer });
    const session = await seedLongSession(deps, 13);
    const stored = deps.chatSessions.sessions.get(session.id)!;
    deps.chatSessions.sessions.set(session.id, { ...stored, historySummary: "already summarized 3", historySummarizedCount: 3 });

    await postMessage(session.id, "user-1", "still there?", deps);

    // 14 prior messages now (13 seeded + 1 just sent... no, postMessage appends after reading prior) -> still only 3 aged out, already covered.
    expect(historySummarizer.calls).toHaveLength(0);
    expect(answerer.lastInput?.history?.[0]).toEqual({ role: "assistant", text: "Summary of earlier conversation: already summarized 3" });
  });

  it("falls back to a plain windowed slice, without a summary prefix, when summarization fails (NFR-007)", async () => {
    const answerer = new FakeTurnAnswerer({ text: "ok" });
    const historySummarizer = new FakeHistorySummarizer(new Error("OpenAI down"));
    const deps = buildDeps({ turnAnswerer: answerer, historySummarizer });
    const session = await seedLongSession(deps, 13);

    await postMessage(session.id, "user-1", "still there?", deps);

    expect(answerer.lastInput?.history).toHaveLength(10);
    expect(answerer.lastInput?.history?.every((h) => !h.text.startsWith("Summary of earlier conversation"))).toBe(true);
  });
});

describe("renameSession (improvements.md #3.4, Build Plan V2.3.3)", () => {
  it("renames a session the user owns, sanitizing the title the same way the first-message derivation does", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });
    const session = await createSession("user-1", deps);

    const title = await renameSession(session.id, "user-1", "  My renamed chat  ", deps);

    expect(title).toBe("My renamed chat");
    expect(deps.chatSessions.sessions.get(session.id)?.title).toBe("My renamed chat");
  });

  it("falls back to the default title when renamed to a blank string", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });
    const session = await createSession("user-1", deps);

    const title = await renameSession(session.id, "user-1", "   ", deps);

    expect(title).toBe("New chat");
  });

  it("throws for a session the user does not own", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });
    const session = await createSession("owner", deps);

    await expect(renameSession(session.id, "someone-else", "hijacked title", deps)).rejects.toThrow();
  });
});

describe("getSession pagination (Build Plan V2.3.4)", () => {
  it("returns every message with hasMoreMessages false when the page covers the whole conversation (default, unpaginated behavior preserved)", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "hi" },
      { role: "assistant", text: "hello" },
    ]);

    const result = await getSession(session.id, "user-1", deps);

    expect(result.messages).toHaveLength(2);
    expect(result.hasMoreMessages).toBe(false);
  });

  it("returns only the most recent page and hasMoreMessages true when there are more messages than the limit", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });
    const texts = Array.from({ length: 5 }, (_, i) => ({ role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant", text: `m${i}` }));
    const session = await seedSessionWithMessages(deps, texts);

    const result = await getSession(session.id, "user-1", deps, { limit: 2 });

    expect(result.messages.map((m) => m.text)).toEqual(["m3", "m4"]);
    expect(result.hasMoreMessages).toBe(true);
  });

  it("fetches the page before a given message using the before cursor", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });
    const texts = Array.from({ length: 5 }, (_, i) => ({ role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant", text: `m${i}` }));
    const session = await seedSessionWithMessages(deps, texts);
    const firstPage = await getSession(session.id, "user-1", deps, { limit: 2 });
    const oldestLoaded = firstPage.messages[0];

    const olderPage = await getSession(session.id, "user-1", deps, { limit: 2, before: oldestLoaded.createdAt });

    expect(olderPage.messages.map((m) => m.text)).toEqual(["m1", "m2"]);
    expect(olderPage.hasMoreMessages).toBe(true);
  });
});

describe("editMessage (Build Plan V2.6)", () => {
  it("throws when the target message doesn't exist", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });
    const session = await seedSessionWithMessages(deps, [{ role: "user", text: "hi" }, { role: "assistant", text: "hello" }]);

    await expect(editMessage(session.id, "user-1", "no-such-id", "edited", deps)).rejects.toThrow(MessageNotFoundError);
  });

  it("throws when trying to edit an assistant message", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });
    const session = await seedSessionWithMessages(deps, [{ role: "user", text: "hi" }, { role: "assistant", text: "hello" }]);

    await expect(editMessage(session.id, "user-1", "seed-1", "edited", deps)).rejects.toThrow(NotEditableMessageError);
  });

  it("Case 2 — editing the last user message: creates a sibling, re-answers, and the OLD reply is preserved but no longer active", async () => {
    const answerer = new FakeTurnAnswerer({ text: "new answer", answerSource: "grounded" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "aspirin and warfarin?" },
      { role: "assistant", text: "old answer" },
    ]);

    const { userMessage, assistantMessage } = await editMessage(session.id, "user-1", "seed-0", "aspirin and ibuprofen?", deps);

    expect(userMessage.text).toBe("aspirin and ibuprofen?");
    expect(userMessage.parentId).toBeUndefined(); // same parent as the original (none — it's the root)
    expect(assistantMessage.text).toBe("new answer");

    // The active transcript now shows only the new branch...
    const active = await getSession(session.id, "user-1", deps);
    expect(active.messages.map((m) => m.text)).toEqual(["aspirin and ibuprofen?", "new answer"]);

    // ...but the original pair still exists in storage, just off the active path.
    const allStored = await deps.chatSessions.listMessages(session.id);
    expect(allStored.map((m) => m.text).sort()).toEqual(["aspirin and ibuprofen?", "aspirin and warfarin?", "new answer", "old answer"].sort());
  });

  it("Case 3 — editing an EARLIER message keeps its ancestors and forks everything after it into a new branch", async () => {
    const answerer = new FakeTurnAnswerer({ text: "second answer, take two" });
    const deps = buildDeps({ turnAnswerer: answerer });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "hi" },
      { role: "assistant", text: "hello" },
      { role: "user", text: "aspirin and warfarin?" },
      { role: "assistant", text: "severe interaction" },
    ]);

    await editMessage(session.id, "user-1", "seed-2", "aspirin and ibuprofen?", deps);

    const active = await getSession(session.id, "user-1", deps);
    expect(active.messages.map((m) => m.text)).toEqual(["hi", "hello", "aspirin and ibuprofen?", "second answer, take two"]);
    // history handed to the answerer is only the true ancestors ("hi"/"hello"), not the stale reply
    expect(answerer.lastInput?.history).toEqual([{ role: "user", text: "hi" }, { role: "assistant", text: "hello" }]);
  });

  it("switching back to the original branch after an edit resumes it exactly, and shows the sibling count", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "new answer" }) });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "aspirin and warfarin?" },
      { role: "assistant", text: "old answer" },
    ]);
    const { userMessage: editedMessage } = await editMessage(session.id, "user-1", "seed-0", "edited question", deps);

    const afterEdit = await getSession(session.id, "user-1", deps);
    const editedInResponse = afterEdit.messages.find((m) => m.text === "edited question")!;
    expect(editedInResponse.editIndex).toBe(2);
    expect(editedInResponse.editCount).toBe(2);
    expect(editedInResponse.siblingIds).toEqual(["seed-0", editedMessage.id]);

    await switchMessageBranch(session.id, "user-1", "seed-0", deps);
    const afterSwitch = await getSession(session.id, "user-1", deps);
    expect(afterSwitch.messages.map((m) => m.text)).toEqual(["aspirin and warfarin?", "old answer"]);

    await switchMessageBranch(session.id, "user-1", editedMessage.id, deps);
    const afterSwitchBack = await getSession(session.id, "user-1", deps);
    expect(afterSwitchBack.messages.map((m) => m.text)).toEqual(["edited question", "new answer"]);
  });

  it("editing the session's very first message regenerates the title, same as postMessage's first-message rule", async () => {
    const titleGenerator = new FakeTitleGenerator("A Better Title");
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }), titleGenerator });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "hi" },
      { role: "assistant", text: "hello" },
    ]);
    deps.chatSessions.sessions.set(session.id, { ...session, title: "New chat" });

    await editMessage(session.id, "user-1", "seed-0", "a whole new opening question", deps);

    expect(titleGenerator.calls).toEqual(["a whole new opening question"]);
    expect((await deps.chatSessions.findById(session.id))!.title).toBe("A Better Title");
  });

  it("editing a LATER message never touches the title, even if it's still the default", async () => {
    const titleGenerator = new FakeTitleGenerator("Should Not Be Used");
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }), titleGenerator });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "hi" },
      { role: "assistant", text: "hello" },
      { role: "user", text: "aspirin and warfarin?" },
      { role: "assistant", text: "severe interaction" },
    ]);
    deps.chatSessions.sessions.set(session.id, { ...session, title: "New chat" });

    await editMessage(session.id, "user-1", "seed-2", "aspirin and ibuprofen?", deps);

    expect(titleGenerator.calls).toEqual([]);
    expect((await deps.chatSessions.findById(session.id))!.title).toBe("New chat");
  });
});

describe("switchMessageBranch (Build Plan V2.6)", () => {
  it("throws when the target message doesn't exist", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "n/a" }) });
    const session = await seedSessionWithMessages(deps, [{ role: "user", text: "hi" }, { role: "assistant", text: "hello" }]);

    await expect(switchMessageBranch(session.id, "user-1", "no-such-id", deps)).rejects.toThrow(MessageNotFoundError);
  });

  it("switching a root-level branch (the very first message was edited) flips the session's activeFirstMessageId", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "new answer" }) });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "original first message" },
      { role: "assistant", text: "original answer" },
    ]);
    const { userMessage: editedRoot } = await editMessage(session.id, "user-1", "seed-0", "edited first message", deps);

    const result = await switchMessageBranch(session.id, "user-1", "seed-0", deps);

    expect(result.messages.map((m) => m.text)).toEqual(["original first message", "original answer"]);
    expect((await deps.chatSessions.findById(session.id))!.activeFirstMessageId).toBe("seed-0");

    await switchMessageBranch(session.id, "user-1", editedRoot.id, deps);
    expect((await deps.chatSessions.findById(session.id))!.activeFirstMessageId).toBe(editedRoot.id);
  });

  it("returns the same shape as getSession, ready to replace the client's transcript directly", async () => {
    const deps = buildDeps({ turnAnswerer: new FakeTurnAnswerer({ text: "new answer" }) });
    const session = await seedSessionWithMessages(deps, [
      { role: "user", text: "aspirin and warfarin?" },
      { role: "assistant", text: "old answer" },
    ]);
    await editMessage(session.id, "user-1", "seed-0", "edited", deps);

    const switched = await switchMessageBranch(session.id, "user-1", "seed-0", deps);
    const fetched = await getSession(session.id, "user-1", deps);

    expect(switched.messages.map((m) => m.id)).toEqual(fetched.messages.map((m) => m.id));
    expect(switched.hasMoreMessages).toBe(fetched.hasMoreMessages);
  });
});
