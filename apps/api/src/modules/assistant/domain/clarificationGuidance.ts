export interface ConfirmationCandidate {
  id: string;
  name: string;
}

export type ClarificationCategory = "medications" | "allergies" | "conditions";
export type ClarificationAction = "add" | "remove";

/**
 * A single name that resolution couldn't silently settle — either one close
 * candidate needing a yes/no, or several candidates too close to guess
 * between. Persisted on the session for exactly one follow-up turn
 * (single-shot: an unanswered or unclear reply drops it rather than looping
 * indefinitely — see `interpretPendingClarifications` in `useCases.ts`).
 */
export type PendingClarification =
  | { category: ClarificationCategory; action: ClarificationAction; kind: "confirm"; queryName: string; candidate: ConfirmationCandidate }
  | { category: ClarificationCategory; action: ClarificationAction; kind: "disambiguate"; queryName: string; candidates: ConfirmationCandidate[] };

function joinWithOr(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

/**
 * Deterministic clarification question text (improvements.md #1.3/#1.4) —
 * never LLM-composed, same reasoning as `buildIntakeQuestion`: a question
 * whose answer changes what gets checked shouldn't vary in wording or be
 * subject to prompt drift. Takes priority over the intake gate in `runTurn`
 * — resolving WHICH drug was meant must happen before concluding anything
 * about it.
 */
export function buildClarificationQuestion(pending: PendingClarification[]): string {
  const parts = pending.map((item) => {
    if (item.kind === "confirm") {
      return `Did you mean "${item.candidate.name}" when you said "${item.queryName}"?`;
    }
    return `You mentioned "${item.queryName}" — did you mean ${joinWithOr(item.candidates.map((c) => c.name))}?`;
  });
  return `${parts.join(" ")} (Just reply yes/no, or name the one you meant.)`;
}

/**
 * Deterministic acknowledgment for a clarification that couldn't be resolved
 * from the follow-up reply (declined, or an unclear/no-match answer) — the
 * item is dropped for this turn rather than asked again indefinitely.
 */
export function buildClarificationDroppedNote(queryName: string): string {
  return `I'll leave "${queryName}" out for now — mention it again by its exact name if you'd like me to include it.`;
}
