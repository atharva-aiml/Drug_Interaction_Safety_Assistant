import { Risk } from "@disa/shared-types";

export interface CatalogEntry {
  id: string;
  name: string;
}

/** Own read-only catalog port — small, deliberately re-implemented per module rather than shared (same "own your infrastructure" precedent as every other module's catalog lookups). */
export interface AssistantCatalogPort {
  listDrugs(): Promise<CatalogEntry[]>;
  listAllergens(): Promise<CatalogEntry[]>;
  listDiseases(): Promise<CatalogEntry[]>;
}

export interface ExtractedEntities {
  medications: string[];
  allergies: string[];
  conditions: string[];
  /**
   * A symptom/complaint the user is currently experiencing (e.g. "nose
   * bleeding", "nausea") — distinct from `conditions`, which is a
   * previously-diagnosed condition (e.g. "Chronic Kidney Disease") used for
   * contraindication checks. A symptom is never looked up in the Disease
   * catalog — it's part of what triggers the intake-gate flow instead (see
   * `runTurn`).
   */
  symptoms: string[];
  /**
   * Each true ONLY if the user's own words explicitly deny that specific
   * category (e.g. "no allergies") — distinct from simply not mentioning
   * it, and distinct from positively answering a DIFFERENT category (a
   * message that only names an allergy must never mark conditions denied).
   * Kept as three independent fields rather than one array — live testing
   * showed the model reliably judges each category on its own when forced
   * to answer per-category, but over-generalizes ("the user replied, so
   * everything's covered") when asked to fill one combined list. Lets the
   * intake gate tell "confirmed empty" apart from "not yet answered" (see
   * `runTurn`).
   */
  medicationsDenied: boolean;
  allergiesDenied: boolean;
  conditionsDenied: boolean;
  /**
   * Names the user says they no longer take/have (e.g. "I stopped taking
   * aspirin", "remove my penicillin allergy") — improvements.md #1.8, Build
   * Plan V2.1.7. Resolved against the catalog the same way as an addition
   * (including the confirm/disambiguate gate) before being subtracted from
   * the accumulated session profile in `runTurn`.
   */
  medicationsRemoved: string[];
  allergiesRemoved: string[];
  conditionsRemoved: string[];
  /**
   * True ONLY if the user is explicitly asking about THEIR OWN risk/safety
   * status (e.g. "am I still at risk?", "is this safe for me?", "check
   * again") — false for a general/definitional question that doesn't ask
   * about their own situation (e.g. "what is bruising?", "what is a pain
   * reliever?"). Bugfix (reported live, V2.1 addendum): without this signal,
   * `runTurn` re-ran the full grounded risk-check pipeline on every message
   * once a profile had data, mislabeling unrelated follow-up questions as a
   * fresh "checked against your data" conclusion.
   */
  wantsRiskRecheck: boolean;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
}

/**
 * Build Plan V2.2.0/V2.2.7 — optional streaming/cancellation controls, added
 * to every LLM call site. `onChunk` fires with each partial text delta as it
 * arrives (never called at all for a caller that doesn't pass it — the real
 * adapter falls back to its original non-streaming request). `signal` aborts
 * the underlying OpenAI request; an aborted call rejects like any other LLM
 * failure, so it flows into the SAME NFR-007 fallback path a network error
 * already does — "stop generating" never persists a truncated claim, it
 * persists the deterministic fallback exactly as if the call had failed.
 */
export interface StreamControls {
  onChunk?: (delta: string) => void;
  signal?: AbortSignal;
}

export interface GroundedRisk {
  risk: Risk;
  explanation: string;
  tips: string[];
}

export interface ComposeAnswerInput extends StreamControls {
  userMessage: string;
  groundedRisks: GroundedRisk[];
  unresolvedNames: string[];
  /** When present, the answer should explicitly address whether the grounded risks (or their absence) relate to these — never inventing a causal claim beyond the given facts. */
  symptoms?: string[];
  /** Prior turns in this session, for phrasing continuity only — never a source of new risk/interaction facts (those always come from `groundedRisks`, recomputed fresh every turn). */
  history?: ConversationTurn[];
}

export interface ComposeGeneralAnswerInput extends StreamControls {
  userMessage: string;
  history?: ConversationTurn[];
}

/**
 * The only module that talks to an LLM. `extractEntities` turns free text
 * into candidate entity names; `composeAnswer` rephrases an already-grounded
 * fact set into prose — it must never be given raw graph/query access, only
 * the grounded facts, which is what keeps REQ-011/REQ-029's grounding
 * guarantee true with an LLM in the loop. `composeGeneralAnswer` handles
 * messages with nothing substantive to check (greetings, general
 * health/pharmacology questions) — it may draw on general knowledge, but
 * must never assert a conclusion about the user's own personal risk, since
 * no data was actually checked for that turn.
 */
export interface LlmPort {
  extractEntities(input: { message: string; history?: ConversationTurn[]; signal?: AbortSignal }): Promise<ExtractedEntities>;
  composeAnswer(input: ComposeAnswerInput): Promise<string>;
  composeGeneralAnswer(input: ComposeGeneralAnswerInput): Promise<string>;
  /** Build Plan V2.3.1 — a short (3-6 word) session title summarizing the first message, upgrading the deterministic truncated fallback. */
  generateTitle(input: { userMessage: string; signal?: AbortSignal }): Promise<string>;
  /** Build Plan V2.3.2 — folds messages aging out of the context window into a running summary, for conversational continuity only (never a source of grounded facts, same rule as any other history turn). */
  summarizeHistory(input: { existingSummary: string; olderMessages: ConversationTurn[]; signal?: AbortSignal }): Promise<string>;
}

export class ExtractionFailedError extends Error {}
