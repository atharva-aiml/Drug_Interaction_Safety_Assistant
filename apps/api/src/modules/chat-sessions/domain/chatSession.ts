export class ChatSessionNotFoundError extends Error {
  constructor(id: string) {
    super(`No chat session with id ${id}`);
  }
}

export class ForbiddenSessionAccessError extends Error {
  constructor(id: string) {
    super(`Chat session ${id} does not belong to the current user.`);
  }
}

export class EmptyMessageError extends Error {
  constructor() {
    super("Message text is required.");
  }
}

export class NothingToRegenerateError extends Error {
  constructor() {
    super("There is no assistant reply to regenerate yet.");
  }
}

export class MessageNotFoundError extends Error {
  constructor(id: string) {
    super(`No message with id ${id} in this session.`);
  }
}

export class NotEditableMessageError extends Error {
  constructor() {
    super("Only a user message can be edited.");
  }
}

const DEFAULT_TITLE = "New chat";
const MAX_TITLE_LENGTH = 60;

/**
 * Business rule: a chat session may only be read/written by the user who
 * owns it (System Architecture §5's second-check pattern, same shape as
 * `requireAdmin` layering after `requireAuth`). Pure — takes the already-
 * fetched session, doesn't query anything itself.
 */
export function assertOwnedBy(session: { id: string; userId: string }, userId: string): void {
  if (session.userId !== userId) {
    throw new ForbiddenSessionAccessError(session.id);
  }
}

export function assertNonEmptyMessage(text: string): void {
  if (!text || !text.trim()) {
    throw new EmptyMessageError();
  }
}

/** Business rule (Build Plan V2.6): only a user message can be edited — an assistant reply is regenerated instead, never edited directly. */
export function assertEditableMessage(message: { role: "user" | "assistant" }): void {
  if (message.role !== "user") {
    throw new NotEditableMessageError();
  }
}

/**
 * Deterministic title derivation (no LLM call for this, per the approved
 * plan — an extra request for a cosmetic label isn't worth the latency/cost).
 */
export function deriveTitle(firstMessageText: string): string {
  const trimmed = firstMessageText.trim();
  if (!trimmed) return DEFAULT_TITLE;
  return trimmed.length > MAX_TITLE_LENGTH ? `${trimmed.slice(0, MAX_TITLE_LENGTH - 1)}…` : trimmed;
}

export function isDefaultTitle(title: string): boolean {
  return title === DEFAULT_TITLE;
}

export { DEFAULT_TITLE };

interface RoleBearingMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

/**
 * Business rule (improvements.md #2.7, Build Plan V2.2.6): regeneration only
 * makes sense on the session's most recent turn — the last message must be
 * an assistant reply, immediately preceded by the user message that
 * prompted it. Pure — takes the already-fetched message list (oldest
 * first), doesn't query anything itself.
 */
export function findRegenerationTarget<T extends RoleBearingMessage>(messages: T[]): { userMessage: T; assistantMessage: T } {
  if (messages.length < 2) {
    throw new NothingToRegenerateError();
  }
  const assistantMessage = messages[messages.length - 1];
  const userMessage = messages[messages.length - 2];
  if (assistantMessage.role !== "assistant" || userMessage.role !== "user") {
    throw new NothingToRegenerateError();
  }
  return { userMessage, assistantMessage };
}

export interface HistoryWindowPlan<T> {
  /** True only when there are older messages not yet folded into the persisted summary — the caller should make one new summarization call and persist the result. */
  needsSummarization: boolean;
  /** The NEW older messages to fold in this turn (never re-includes ones already summarized). */
  messagesToSummarize: T[];
  /** The most recent messages to still pass verbatim, regardless of whether summarization is needed. */
  recentMessages: T[];
}

/**
 * Business rule (improvements.md #3.3, Build Plan V2.3.2): once a session
 * has more prior messages than the context window, the ones that would
 * otherwise be silently dropped get folded into a running summary instead —
 * but only the messages not already covered by a PRIOR summarization call,
 * never re-summarizing the same ones twice. Pure — takes the already-
 * fetched message list and the session's persisted `alreadySummarizedCount`,
 * doesn't query or call an LLM itself (see `chat-sessions/application/
 * useCases.ts`'s `buildHistoryForTurn`, which acts on this plan).
 */
export function planHistoryWindow<T>(allPriorMessages: T[], alreadySummarizedCount: number, windowSize: number): HistoryWindowPlan<T> {
  if (allPriorMessages.length <= windowSize) {
    return { needsSummarization: false, messagesToSummarize: [], recentMessages: allPriorMessages };
  }
  const recentMessages = allPriorMessages.slice(-windowSize);
  const targetSummarizedCount = allPriorMessages.length - windowSize;
  if (targetSummarizedCount <= alreadySummarizedCount) {
    return { needsSummarization: false, messagesToSummarize: [], recentMessages };
  }
  const messagesToSummarize = allPriorMessages.slice(alreadySummarizedCount, targetSummarizedCount);
  return { needsSummarization: true, messagesToSummarize, recentMessages };
}

interface TreeMessage {
  id: string;
  parentId?: string;
  /** Only ever meaningful on an assistant message — which of its (possibly several, edited) user-message children continues the active branch. A user message never needs this itself: it has at most one assistant child by construction (`regenerateLastMessage` always replaces that child in place rather than branching it). */
  activeChildId?: string;
  createdAt: string;
}

function sortByCreatedAt<T extends { createdAt: string }>(a: T, b: T): number {
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/**
 * Business rule (Build Plan V2.6): reconstructs the single, currently-active
 * linear transcript out of the session's full message TREE — every message
 * ever created stays in storage (editing is non-destructive), but only one
 * path through it is "the conversation" at any moment. Pure — takes the
 * already-fetched raw message list (any order) and the session's persisted
 * `activeFirstMessageId`, walks parent -> active-child links to the current
 * leaf. Falls back to the newest candidate at any branch point with no
 * explicit pointer yet (a session created before this feature, or a branch
 * nothing has switched away from) — never throws on a dangling/missing
 * pointer, since a stale id there is just a hint, not a fact to trust blindly.
 */
export function buildActivePath<T extends TreeMessage>(allMessages: T[], activeFirstMessageId?: string): T[] {
  // A real session created before this feature shipped has NO parentId anywhere — every message
  // would otherwise look like an unrelated root, collapsing the reconstructed path to just one
  // message. Detect that case and fall back to the original flat chronological order verbatim.
  if (allMessages.length > 1 && allMessages.every((m) => !m.parentId)) {
    return [...allMessages].sort(sortByCreatedAt);
  }

  const byId = new Map(allMessages.map((m) => [m.id, m]));
  const childrenByParent = new Map<string, T[]>();
  const roots: T[] = [];
  for (const m of allMessages) {
    if (m.parentId) {
      const list = childrenByParent.get(m.parentId);
      if (list) list.push(m);
      else childrenByParent.set(m.parentId, [m]);
    } else {
      roots.push(m);
    }
  }
  roots.sort(sortByCreatedAt);
  for (const list of childrenByParent.values()) list.sort(sortByCreatedAt);

  const start = (activeFirstMessageId ? byId.get(activeFirstMessageId) : undefined) ?? roots[roots.length - 1];
  if (!start) return [];

  const path: T[] = [start];
  let current = start;
  for (;;) {
    const children = childrenByParent.get(current.id);
    if (!children || children.length === 0) break;
    const next = (current.activeChildId ? byId.get(current.activeChildId) : undefined) ?? children[children.length - 1];
    if (!next) break;
    path.push(next);
    current = next;
  }
  return path;
}

/**
 * Decorates each message on the active path with its sibling info (Build
 * Plan V2.6) — present only on a message that has more than one version,
 * i.e. one of its siblings (itself included) came from an edit. `allMessages`
 * must be the same raw set `buildActivePath` was given, so a switched-away
 * sibling still gets counted correctly even though it isn't on the path.
 */
export function withSiblingMetadata<T extends { id: string; parentId?: string; createdAt: string }>(
  activePath: T[],
  allMessages: T[]
): (T & { editIndex?: number; editCount?: number; siblingIds?: string[] })[] {
  const ROOT_KEY = " ROOT ";
  const groups = new Map<string, T[]>();
  for (const m of allMessages) {
    const key = m.parentId ?? ROOT_KEY;
    const list = groups.get(key);
    if (list) list.push(m);
    else groups.set(key, [m]);
  }
  for (const list of groups.values()) list.sort(sortByCreatedAt);

  return activePath.map((m) => {
    const siblings = groups.get(m.parentId ?? ROOT_KEY) ?? [m];
    if (siblings.length <= 1) return { ...m };
    const editIndex = siblings.findIndex((s) => s.id === m.id) + 1;
    return { ...m, editIndex, editCount: siblings.length, siblingIds: siblings.map((s) => s.id) };
  });
}

export interface MessagePage<T> {
  messages: T[];
  hasMore: boolean;
}

/**
 * Build Plan V2.6 — replaces the old Cypher-level `ORDER BY ... LIMIT`
 * pagination (V2.3.4), which can no longer work once the "conversation" is a
 * reconstructed path through a tree rather than a flat sorted column. Same
 * semantics as before: the `limit` messages immediately before `before`
 * (or the most recent `limit` overall, if `before` is omitted), oldest first,
 * plus whether anything older still exists beyond that window. Pure — takes
 * the already-reconstructed active path (oldest first).
 */
export function paginateActivePath<T extends { createdAt: string }>(
  activePath: T[],
  opts: { limit: number; before?: string }
): MessagePage<T> {
  const eligible = opts.before === undefined ? activePath : activePath.filter((m) => m.createdAt < opts.before!);
  const hasMore = eligible.length > opts.limit;
  const messages = eligible.slice(Math.max(0, eligible.length - opts.limit));
  return { messages, hasMore };
}
