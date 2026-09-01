import { ChatMessage, ChatSessionSummary, CypherQueryView, Risk } from "@disa/shared-types";
import { PendingClarification } from "../../assistant/domain/clarificationGuidance.js";

/** Backend-internal shape — adds the fields (`userId`, `patientId`) the client response never needs. */
export interface ChatSessionRecord extends ChatSessionSummary {
  userId: string;
  patientId: string;
  /** True once the medications/allergies/conditions intake gathering is done for this session (either fully answered or the retry cap was hit) — see `assistant`'s `runTurn`. */
  intakeComplete: boolean;
  /** How many times the intake question has been asked so far (capped at `MAX_INTAKE_ASKS` in `assistant`). */
  intakeAskCount: number;
  /** Name-resolution clarifications still awaiting this session's next reply (improvements.md #1.3/#1.4, Build Plan V2.1.4/V2.1.5) — always resolved (one way or another) within one follow-up turn. */
  pendingClarifications: PendingClarification[];
  /** One-time disclosure flags (improvements.md #1.10/#1.11, Build Plan V2.1.9/V2.1.10) — each fires at most once per session. */
  multiPersonNoticeShown: boolean;
  dosageNoticeShown: boolean;
  /** Running summary of messages that have aged out of the LLM context window (improvements.md #3.3, Build Plan V2.3.2) — "" until the session first exceeds the window. Never fed to the grounded risk pipeline, only threaded into `history` for conversational continuity, same non-fact-source rule as any other history turn. */
  historySummary: string;
  /** How many of the session's oldest messages are already folded into `historySummary` — lets `planHistoryWindow` tell "already covered" apart from "newly aged out". */
  historySummarizedCount: number;
  /** Build Plan V2.6 — which of the session's (possibly several, edited) root messages is on the active branch. Undefined for a session with only one root (i.e. never edited at the very first message) — `buildActivePath` defaults to the newest root in that case. */
  activeFirstMessageId?: string;
}

/** Repository port (ChatSession + ChatMessage aggregates) — implemented for real by Neo4j, faked in tests. */
export interface ChatSessionRepository {
  create(session: ChatSessionRecord): Promise<ChatSessionRecord>;
  listByUser(userId: string): Promise<ChatSessionRecord[]>;
  findById(id: string): Promise<ChatSessionRecord | undefined>;
  updateTitle(id: string, title: string): Promise<void>;
  setPinned(id: string, pinned: boolean): Promise<void>;
  setIntakeComplete(id: string): Promise<void>;
  setIntakeAskCount(id: string, count: number): Promise<void>;
  setPendingClarifications(id: string, pending: PendingClarification[]): Promise<void>;
  setMultiPersonNoticeShown(id: string): Promise<void>;
  setDosageNoticeShown(id: string): Promise<void>;
  setHistorySummary(id: string, summary: string, summarizedCount: number): Promise<void>;
  /** Build Plan V2.6 — which root message is active (a session's very first message has been edited); see `activeFirstMessageId`. */
  setActiveFirstMessage(sessionId: string, messageId: string): Promise<void>;
  /** Build Plan V2.6 — which child continues the active branch from this (necessarily assistant) message; see `buildActivePath`. */
  setActiveChildId(messageId: string, childId: string): Promise<void>;
  appendMessage(message: ChatMessage): Promise<ChatMessage>;
  /**
   * EVERY message ever created for this session, across every branch, in no
   * particular guaranteed order — the raw material `buildActivePath`/
   * `withSiblingMetadata` (domain) reconstruct the active transcript and
   * pagination from (Build Plan V2.6). Also what turn processing uses to plan
   * the history window, which needs the true total count either way. Never
   * exposed directly to a paginated UI fetch — see `getSession`, which does
   * the reconstruction and pagination itself.
   */
  listMessages(sessionId: string): Promise<ChatMessage[]>;
  /** A single message by id, regardless of which branch it's on — used to look up the target of an edit or a branch switch, neither of which is necessarily on the current active path. */
  findMessageById(id: string): Promise<ChatMessage | undefined>;
  /** Removes a single message (Build Plan V2.2.6) — used to replace a stale reply during regeneration, never exposed as a general delete-any-message API. */
  deleteMessage(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Build Plan V2.3.1 — a short, LLM-generated session title, upgrading the deterministic truncated fallback. Owned by chat-sessions, implemented by an adapter wrapping `assistant`'s `LlmPort` (same one-way adapter shape as `AssistantTurnAnswerer`). */
export interface TitleGenerator {
  generateTitle(userMessage: string): Promise<string>;
}

/** Build Plan V2.3.2 — folds messages aging out of the context window into a running summary. */
export interface HistorySummarizer {
  summarize(existingSummary: string, olderMessages: { role: ChatMessage["role"]; text: string }[]): Promise<string>;
}

/** Build Plan V2.2.0/V2.2.7 — streaming/cancellation controls for `postMessage`/`regenerateLastMessage`, threaded down to `TurnAnswerer.answer`. */
export interface StreamHooks {
  onChunk?: (delta: string) => void;
  signal?: AbortSignal;
}

export interface TurnResult {
  text: string;
  risks?: Risk[];
  cypherQueries?: CypherQueryView[];
  tips?: string[];
  unresolvedNames?: string[];
  intakeAskCount?: number;
  intakeJustCompleted?: boolean;
  isEmergency?: boolean;
  emergencyCategory?: string;
  answerSource?: "grounded" | "general";
  pendingClarifications?: PendingClarification[];
  multiPersonNoticeShown?: true;
  dosageNoticeShown?: true;
}

/**
 * Port to whatever actually answers a turn. Implemented by the real
 * `assistant` module's `runTurn`. `history` is the session's prior messages
 * (oldest first) — lets the answerer tell a fresh report apart from a reply
 * to its own previous question. `intakeComplete`/`intakeAskCount` reflect
 * how far the medications/allergies/conditions gathering step has gotten
 * for this session; `pendingClarifications`/`*NoticeShown` carry forward the
 * rest of this session's cross-turn state the same way.
 */
export interface TurnAnswerer {
  answer(input: {
    patientId: string;
    text: string;
    history?: { role: ChatMessage["role"]; text: string }[];
    intakeComplete: boolean;
    intakeAskCount: number;
    pendingClarifications: PendingClarification[];
    multiPersonNoticeShown: boolean;
    dosageNoticeShown: boolean;
    /** Set only by `regenerateLastMessage` (Build Plan V2.2.6) — see `runTurn`'s own doc comment for why a regenerate needs this. */
    forceGroundedCheck?: boolean;
    /** Build Plan V2.2.0/V2.2.7 — streams the final answer's text deltas as they arrive; `signal` aborts the whole turn (an aborted LLM call falls back the same way a failed one does — see `assistant`'s `StreamControls`). */
    onChunk?: (delta: string) => void;
    signal?: AbortSignal;
  }): Promise<TurnResult>;
}
