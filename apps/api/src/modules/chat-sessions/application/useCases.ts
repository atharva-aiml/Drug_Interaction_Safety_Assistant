import { ChatMessage } from "@disa/shared-types";
import { PatientRepository, ReferenceCatalogPort } from "../../patients/application/ports.js";
import { createPatient } from "../../patients/application/useCases.js";
import {
  assertEditableMessage,
  assertNonEmptyMessage,
  assertOwnedBy,
  buildActivePath,
  deriveTitle,
  findRegenerationTarget,
  isDefaultTitle,
  MessageNotFoundError,
  paginateActivePath,
  planHistoryWindow,
  withSiblingMetadata,
} from "../domain/chatSession.js";
import { ChatSessionNotFoundError } from "../domain/chatSession.js";
import { ChatSessionRecord, ChatSessionRepository, HistorySummarizer, StreamHooks, TitleGenerator, TurnAnswerer, TurnResult } from "./ports.js";

/** How many prior messages to hand the answerer as conversation context — enough to tell a reply from a fresh statement, not so much it bloats every LLM call. */
const HISTORY_TURNS_FOR_CONTEXT = 10;

/** Default page size for a session's message transcript (Build Plan V2.3.4) — generous enough that every conversation this app has ever had loads in one page, exactly as before pagination existed; only a genuinely long conversation ever sees a second page. */
const DEFAULT_MESSAGE_PAGE_SIZE = 50;

export interface ChatSessionDeps {
  chatSessions: ChatSessionRepository;
  patients: PatientRepository;
  catalog: ReferenceCatalogPort;
  turnAnswerer: TurnAnswerer;
  titleGenerator: TitleGenerator;
  historySummarizer: HistorySummarizer;
  newId: () => string;
  now: () => string;
}

/**
 * A chat session IS a patient profile, 1:1 (the approved plan's core reuse
 * decision) — provisioned here via the existing, tested `patients` module's
 * own `createPatient` rather than inventing new profile storage.
 */
export async function createSession(userId: string, deps: ChatSessionDeps): Promise<ChatSessionRecord> {
  const sessionId = deps.newId();
  const timestamp = deps.now();
  const patient = await createPatient(
    { displayName: `Chat session ${sessionId.slice(0, 8)}`, medicationIds: [], allergyIds: [], conditionIds: [] },
    { patients: deps.patients, catalog: deps.catalog, newId: deps.newId, now: deps.now }
  );
  return deps.chatSessions.create({
    id: sessionId,
    userId,
    patientId: patient.id,
    title: "New chat",
    pinned: false,
    intakeComplete: false,
    intakeAskCount: 0,
    pendingClarifications: [],
    multiPersonNoticeShown: false,
    dosageNoticeShown: false,
    historySummary: "",
    historySummarizedCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Business rule (improvements.md #3.4, Build Plan V2.3.3): a session can be
 * renamed to anything non-trivial the user types — reuses `deriveTitle`'s
 * own trim/truncate/default-on-blank behavior, since "turn raw text into a
 * valid title" is the exact same operation whether the text came from the
 * first message or a rename request.
 */
export async function renameSession(sessionId: string, userId: string, newTitle: string, deps: Pick<ChatSessionDeps, "chatSessions">): Promise<string> {
  await getOwnedSession(sessionId, userId, deps);
  const title = deriveTitle(newTitle);
  await deps.chatSessions.updateTitle(sessionId, title);
  return title;
}

export async function listSessions(userId: string, deps: Pick<ChatSessionDeps, "chatSessions">): Promise<ChatSessionRecord[]> {
  return deps.chatSessions.listByUser(userId);
}

/** Pins/unpins a session the caller owns — a plain toggle, no business rule beyond ownership. */
export async function setSessionPinned(
  sessionId: string,
  userId: string,
  pinned: boolean,
  deps: Pick<ChatSessionDeps, "chatSessions">
): Promise<void> {
  await getOwnedSession(sessionId, userId, deps);
  await deps.chatSessions.setPinned(sessionId, pinned);
}

async function getOwnedSession(sessionId: string, userId: string, deps: Pick<ChatSessionDeps, "chatSessions">): Promise<ChatSessionRecord> {
  const session = await deps.chatSessions.findById(sessionId);
  if (!session) {
    throw new ChatSessionNotFoundError(sessionId);
  }
  assertOwnedBy(session, userId);
  return session;
}

/** Build Plan V2.6 — the session's full message tree, reconstructed down to the single currently-active branch (oldest first). Shared by every use case that needs "the conversation as it stands now" rather than every message ever created. */
async function getActivePath(session: ChatSessionRecord, deps: Pick<ChatSessionDeps, "chatSessions">): Promise<{ raw: ChatMessage[]; activePath: ChatMessage[] }> {
  const raw = await deps.chatSessions.listMessages(session.id);
  const activePath = buildActivePath(raw, session.activeFirstMessageId);
  return { raw, activePath };
}

/**
 * Build Plan V2.3.4 for the page-window bounds; Build Plan V2.6 for how the
 * transcript is computed at all: `before`/`limit` are optional — omitting
 * both preserves the original "fetch everything" behavior exactly (via a
 * generous default page size), so every existing caller and every
 * conversation this app has ever had is unaffected. Only a session with more
 * messages than the page size ever gets `hasMoreMessages: true`, at which
 * point the caller can request an older page via `before`. The transcript
 * itself is now the reconstructed ACTIVE branch, not a flat chronological
 * list — see `buildActivePath`.
 */
export async function getSession(
  sessionId: string,
  userId: string,
  deps: Pick<ChatSessionDeps, "chatSessions">,
  page: { limit?: number; before?: string } = {}
): Promise<ChatSessionRecord & { messages: ChatMessage[]; hasMoreMessages: boolean }> {
  const session = await getOwnedSession(sessionId, userId, deps);
  const { raw, activePath } = await getActivePath(session, deps);
  const decorated = withSiblingMetadata(activePath, raw);
  const { messages, hasMore } = paginateActivePath(decorated, { limit: page.limit ?? DEFAULT_MESSAGE_PAGE_SIZE, before: page.before });
  return { ...session, messages, hasMoreMessages: hasMore };
}

/** Persists the cross-turn session state a `TurnResult` may carry — shared by `postMessage`, `regenerateLastMessage`, and `editMessage` so all three apply the exact same rules. */
async function applyTurnSideEffects(sessionId: string, turn: TurnResult, deps: Pick<ChatSessionDeps, "chatSessions">): Promise<void> {
  if (turn.intakeJustCompleted) {
    await deps.chatSessions.setIntakeComplete(sessionId);
  } else if (turn.intakeAskCount !== undefined) {
    await deps.chatSessions.setIntakeAskCount(sessionId, turn.intakeAskCount);
  }
  if (turn.pendingClarifications !== undefined) {
    await deps.chatSessions.setPendingClarifications(sessionId, turn.pendingClarifications);
  }
  if (turn.multiPersonNoticeShown) {
    await deps.chatSessions.setMultiPersonNoticeShown(sessionId);
  }
  if (turn.dosageNoticeShown) {
    await deps.chatSessions.setDosageNoticeShown(sessionId);
  }
}

/** Persists a `TurnResult` as a new assistant `ChatMessage`, as the child of `parentId` (Build Plan V2.6) — shared by `postMessage`, `regenerateLastMessage`, and `editMessage`. */
function appendAssistantMessage(
  sessionId: string,
  parentId: string,
  turn: TurnResult,
  deps: Pick<ChatSessionDeps, "chatSessions" | "newId" | "now">
): Promise<ChatMessage> {
  return deps.chatSessions.appendMessage({
    id: deps.newId(),
    sessionId,
    role: "assistant",
    text: turn.text,
    createdAt: deps.now(),
    parentId,
    risks: turn.risks,
    cypherQueries: turn.cypherQueries,
    tips: turn.tips,
    unresolvedNames: turn.unresolvedNames,
    isEmergency: turn.isEmergency,
    emergencyCategory: turn.emergencyCategory,
    answerSource: turn.answerSource,
  });
}

/**
 * Build Plan V2.3.1: an LLM-generated title upgrades the deterministic
 * truncated one — bounded to exactly once per session (the `isDefaultTitle`
 * gate), and falls back to the deterministic title on any failure (NFR-007)
 * rather than leaving the session untitled or blocking the turn. Shared by
 * `postMessage` (the session's first message) and `editMessage` (only when
 * editing a ROOT message — a title is derived from the conversation's start,
 * so an edit further in never touches it).
 */
async function maybeGenerateTitle(
  sessionId: string,
  session: ChatSessionRecord,
  text: string,
  deps: Pick<ChatSessionDeps, "chatSessions" | "titleGenerator">
): Promise<void> {
  if (!isDefaultTitle(session.title)) return;
  let title = deriveTitle(text);
  try {
    const generated = await deps.titleGenerator.generateTitle(text);
    if (generated && generated.trim()) title = deriveTitle(generated);
  } catch {
    // keep the deterministic fallback already computed above
  }
  await deps.chatSessions.updateTitle(sessionId, title);
}

/**
 * Builds the `history` handed to the answerer for this turn — shared by
 * `postMessage`, `regenerateLastMessage`, and `editMessage` (Build Plan
 * V2.3.2). Below the window, this is byte-for-byte the original "slice the
 * last N" behavior. Once a session outgrows the window, `planHistoryWindow`
 * decides whether NEW older messages need folding into the running summary,
 * never re-summarizing the same ones twice. On failure (NFR-007), falls back
 * to the plain windowed slice — conversational continuity degrades
 * gracefully, the turn is never blocked by it, and nothing here is ever a
 * source of grounded facts (same rule as any other history turn — see
 * `COMPOSE_SYSTEM_PROMPT`).
 */
async function buildHistoryForTurn(
  session: ChatSessionRecord,
  priorMessages: ChatMessage[],
  deps: Pick<ChatSessionDeps, "chatSessions" | "historySummarizer">
): Promise<{ role: ChatMessage["role"]; text: string }[]> {
  const plan = planHistoryWindow(priorMessages, session.historySummarizedCount, HISTORY_TURNS_FOR_CONTEXT);
  const recent = plan.recentMessages.map((m) => ({ role: m.role, text: m.text }));

  if (!plan.needsSummarization) {
    return session.historySummary
      ? [{ role: "assistant" as const, text: `Summary of earlier conversation: ${session.historySummary}` }, ...recent]
      : recent;
  }

  try {
    const updatedSummary = await deps.historySummarizer.summarize(
      session.historySummary,
      plan.messagesToSummarize.map((m) => ({ role: m.role, text: m.text }))
    );
    const summarizedCount = session.historySummarizedCount + plan.messagesToSummarize.length;
    await deps.chatSessions.setHistorySummary(session.id, updatedSummary, summarizedCount);
    return [{ role: "assistant" as const, text: `Summary of earlier conversation: ${updatedSummary}` }, ...recent];
  } catch {
    return recent;
  }
}

export async function postMessage(
  sessionId: string,
  userId: string,
  text: string,
  deps: ChatSessionDeps,
  hooks: StreamHooks & { onUserMessage?: (message: ChatMessage) => void } = {}
): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
  assertNonEmptyMessage(text);
  const session = await getOwnedSession(sessionId, userId, deps);

  const { activePath } = await getActivePath(session, deps);
  const history = await buildHistoryForTurn(session, activePath, deps);
  const parentId = activePath.length > 0 ? activePath[activePath.length - 1].id : undefined;

  const userMessage = await deps.chatSessions.appendMessage({
    id: deps.newId(),
    sessionId,
    role: "user",
    text,
    createdAt: deps.now(),
    parentId,
  });
  hooks.onUserMessage?.(userMessage);

  await maybeGenerateTitle(sessionId, session, text, deps);

  const turn = await deps.turnAnswerer.answer({
    patientId: session.patientId,
    text,
    history,
    intakeComplete: session.intakeComplete,
    intakeAskCount: session.intakeAskCount,
    pendingClarifications: session.pendingClarifications,
    multiPersonNoticeShown: session.multiPersonNoticeShown,
    dosageNoticeShown: session.dosageNoticeShown,
    onChunk: hooks.onChunk,
    signal: hooks.signal,
  });

  await applyTurnSideEffects(sessionId, turn, deps);
  const assistantMessage = await appendAssistantMessage(sessionId, userMessage.id, turn, deps);

  return { userMessage, assistantMessage };
}

/**
 * Regenerates the session's most recent assistant reply (improvements.md
 * #2.7, Build Plan V2.2.6) — deletes the old reply and re-answers the same
 * user message that prompted it, using the session's CURRENT cross-turn
 * state (intake progress, pending clarifications, one-time notice flags).
 * Known simplification: that state reflects whatever the original turn left
 * it as (e.g. an incremented intake-ask count) rather than being rewound to
 * "as it was right before that turn" — acceptable since regeneration is
 * aimed at re-phrasing a concluding answer, not replaying the intake gate.
 * Deliberately still a same-branch replacement, not a new branch (Build Plan
 * V2.6 added branching for EDITED USER messages only) — the assistant side
 * keeps exactly its pre-existing one-reply-at-a-time behavior.
 *
 * `forceGroundedCheck` is passed when the stale message was itself a
 * grounded conclusion: by regenerate time the session's intake state has
 * already moved past what it was on the original turn (`intakeComplete` is
 * now `true`), which the V2.1.11 "was there a real reason to check" gate
 * would otherwise read as "nothing new, not the completing turn" and
 * silently reroute to general chat instead of re-phrasing the same
 * grounded answer — a real bug caught live during this feature's own
 * verification (see Build Plan V2.2.6).
 */
export async function regenerateLastMessage(
  sessionId: string,
  userId: string,
  deps: ChatSessionDeps,
  hooks: StreamHooks = {}
): Promise<{ assistantMessage: ChatMessage }> {
  const session = await getOwnedSession(sessionId, userId, deps);
  const { activePath } = await getActivePath(session, deps);
  const { userMessage, assistantMessage: staleMessage } = findRegenerationTarget(activePath);

  await deps.chatSessions.deleteMessage(staleMessage.id);

  const priorMessages = activePath.slice(0, activePath.length - 2);
  const history = await buildHistoryForTurn(session, priorMessages, deps);

  const turn = await deps.turnAnswerer.answer({
    patientId: session.patientId,
    text: userMessage.text,
    history,
    intakeComplete: session.intakeComplete,
    intakeAskCount: session.intakeAskCount,
    pendingClarifications: session.pendingClarifications,
    multiPersonNoticeShown: session.multiPersonNoticeShown,
    dosageNoticeShown: session.dosageNoticeShown,
    forceGroundedCheck: staleMessage.answerSource === "grounded",
    onChunk: hooks.onChunk,
    signal: hooks.signal,
  });

  await applyTurnSideEffects(sessionId, turn, deps);
  const assistantMessage = await appendAssistantMessage(sessionId, userMessage.id, turn, deps);

  return { assistantMessage };
}

/**
 * Edits a user message (Build Plan V2.6) — never mutates or deletes the
 * original: creates a new sibling version (same parent) and re-answers from
 * there, so the edited message and everything the answerer produces for it
 * form a fresh branch. The original message and whatever followed it are
 * left exactly as they were, just no longer on the active path — switchable
 * back via `switchMessageBranch`. Works the same way whether `messageId` is
 * the session's very first message (Case 3 in the approved plan — a whole
 * new root branch) or a later one (its ancestors up to that point are kept,
 * only what comes after forks).
 *
 * Known simplification (shared with `regenerateLastMessage`): the new
 * branch's turn runs against the session's CURRENT cross-turn state
 * (intake progress, accumulated patient profile, notices) rather than a
 * rewind to "as it was at that point in the original branch" — approved as
 * part of this feature's plan. In particular the patient profile (the
 * medications/allergies/conditions actually checked against) is session-wide,
 * not per-branch, so a new branch can "know" facts only ever mentioned on a
 * sibling branch. Flagged as a known limitation, not silently glossed over.
 */
export async function editMessage(
  sessionId: string,
  userId: string,
  messageId: string,
  newText: string,
  deps: ChatSessionDeps,
  hooks: StreamHooks & { onUserMessage?: (message: ChatMessage) => void } = {}
): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
  assertNonEmptyMessage(newText);
  const session = await getOwnedSession(sessionId, userId, deps);
  const { activePath } = await getActivePath(session, deps);

  // Editing only ever targets a message the UI is currently showing, which is always on the active
  // path (the UI never renders a switched-away branch) — so this is the one lookup that matters.
  const targetIndex = activePath.findIndex((m) => m.id === messageId);
  if (targetIndex === -1) {
    throw new MessageNotFoundError(messageId);
  }
  const target = activePath[targetIndex];
  assertEditableMessage(target);
  const ancestors = activePath.slice(0, targetIndex);

  const history = await buildHistoryForTurn(session, ancestors, deps);

  const newMessage = await deps.chatSessions.appendMessage({
    id: deps.newId(),
    sessionId,
    role: "user",
    text: newText,
    createdAt: deps.now(),
    parentId: target.parentId,
  });
  hooks.onUserMessage?.(newMessage);

  if (target.parentId) {
    await deps.chatSessions.setActiveChildId(target.parentId, newMessage.id);
  } else {
    await deps.chatSessions.setActiveFirstMessage(sessionId, newMessage.id);
    await maybeGenerateTitle(sessionId, session, newText, deps);
  }

  const turn = await deps.turnAnswerer.answer({
    patientId: session.patientId,
    text: newText,
    history,
    intakeComplete: session.intakeComplete,
    intakeAskCount: session.intakeAskCount,
    pendingClarifications: session.pendingClarifications,
    multiPersonNoticeShown: session.multiPersonNoticeShown,
    dosageNoticeShown: session.dosageNoticeShown,
    onChunk: hooks.onChunk,
    signal: hooks.signal,
  });

  await applyTurnSideEffects(sessionId, turn, deps);
  const assistantMessage = await appendAssistantMessage(sessionId, newMessage.id, turn, deps);

  return { userMessage: newMessage, assistantMessage };
}

/**
 * Switches which branch is active at the fork `messageId` belongs to (Build
 * Plan V2.6) — the "< 2/2 >" navigation. Flips exactly one pointer (the
 * parent's `activeChildId`, or the session's `activeFirstMessageId` for a
 * root message) and nothing else: the target branch's OWN previously-active
 * continuation further down is left untouched from whenever it was last
 * visited, so resuming it picks up exactly where that branch was.
 */
export async function switchMessageBranch(
  sessionId: string,
  userId: string,
  messageId: string,
  deps: Pick<ChatSessionDeps, "chatSessions">
): Promise<ChatSessionRecord & { messages: ChatMessage[]; hasMoreMessages: boolean }> {
  await getOwnedSession(sessionId, userId, deps);
  const raw = await deps.chatSessions.listMessages(sessionId);
  const target = raw.find((m) => m.id === messageId);
  if (!target) {
    throw new MessageNotFoundError(messageId);
  }

  if (target.parentId) {
    await deps.chatSessions.setActiveChildId(target.parentId, target.id);
  } else {
    await deps.chatSessions.setActiveFirstMessage(sessionId, target.id);
  }

  return getSession(sessionId, userId, deps);
}

export async function deleteSession(sessionId: string, userId: string, deps: Pick<ChatSessionDeps, "chatSessions">): Promise<void> {
  await getOwnedSession(sessionId, userId, deps);
  await deps.chatSessions.delete(sessionId);
}
