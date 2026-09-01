import { Risk } from "@disa/shared-types";
import { AllergyLinkRepository } from "../../allergy-links/application/ports.js";
import { ContraindicationRepository } from "../../contraindications/application/ports.js";
import { PatientLookupPort } from "../../explanations/application/ports.js";
import { getRiskDetail } from "../../explanations/application/useCases.js";
import { InteractionRepository } from "../../interactions/application/ports.js";
import { PatientRepository, ReferenceCatalogPort } from "../../patients/application/ports.js";
import { getPatient, updatePatient } from "../../patients/application/useCases.js";
import { QueryLogRepository } from "../../query-log/application/ports.js";
import { recordQuery } from "../../query-log/application/useCases.js";
import { summarizeResult } from "../../query-log/domain/queryLog.js";
import { checkRisks, RiskCheckDeps } from "../../risk-check/application/useCases.js";
import { getPrecautions } from "../domain/safetyTips.js";
import { interpretYesNo, pickDisambiguationChoice, resolveEntityNames } from "../domain/entityResolution.js";
import { buildGenericSymptomTemplate, buildIntakeQuestion } from "../domain/intakeGuidance.js";
import { buildEmergencyResponse, detectEmergency } from "../domain/emergencyDetection.js";
import { buildOffTopicResponse, isLikelyOffTopic } from "../domain/topicRelevance.js";
import {
  buildClarificationDroppedNote,
  buildClarificationQuestion,
  ClarificationAction,
  ClarificationCategory,
  PendingClarification,
} from "../domain/clarificationGuidance.js";
import { buildDosageNotice, buildMultiPersonNotice, detectDosageMention, detectMultiPersonMention } from "../domain/limitationNotices.js";
import { AssistantCatalogPort, ComposeAnswerInput, ConversationTurn, GroundedRisk, LlmPort, StreamControls } from "./ports.js";

export interface RunTurnDeps {
  llm: LlmPort;
  assistantCatalog: AssistantCatalogPort;
  patients: PatientRepository;
  patientCatalog: ReferenceCatalogPort;
  interactions: InteractionRepository;
  allergyLinks: AllergyLinkRepository;
  contraindications: ContraindicationRepository;
  explanationPatients: PatientLookupPort;
  queryLog: QueryLogRepository;
  newId: () => string;
  now: () => string;
}

export type AnswerSource = "grounded" | "general";

export interface TurnResult {
  text: string;
  risks?: Risk[];
  tips?: string[];
  unresolvedNames?: string[];
  /** Set when this turn asked (or re-asked) the intake question but didn't finish gathering — the caller (chat-sessions) persists this as the session's new ask count. */
  intakeAskCount?: number;
  /** Set true on the turn that either gathered everything or hit the retry cap — the caller persists the session's intake state as complete. */
  intakeJustCompleted?: boolean;
  /** True when `detectEmergency` matched this turn's raw text — the caller (chat-sessions) persists this on the message so a reload still shows the escalation treatment. */
  isEmergency?: boolean;
  emergencyCategory?: string;
  /**
   * "grounded" when this answer came from the real checkRisks/getRiskDetail
   * pipeline (even if it found zero risks), "general" when it came from
   * composeGeneralAnswer (no data was checked this turn) — improvements.md
   * #1.6, Build Plan V2.1.3. Omitted for turns that are neither a conclusion
   * nor general chat (an intake question, a clarification question, an
   * unresolved-name notice, or an extraction failure).
   */
  answerSource?: AnswerSource;
  /**
   * Present (possibly empty) on every turn that ran name resolution —
   * absent only on the early extraction-failure return, which leaves
   * whatever was already persisted untouched. The caller (chat-sessions)
   * always overwrites its stored value with this array when present
   * (improvements.md #1.3/#1.4, Build Plan V2.1.4/V2.1.5).
   */
  pendingClarifications?: PendingClarification[];
  /** Set true the first time this session's text triggers the corresponding one-time disclosure (improvements.md #1.10/#1.11, Build Plan V2.1.9/V2.1.10) — the caller persists it so the notice fires at most once per session. */
  multiPersonNoticeShown?: true;
  dosageNoticeShown?: true;
}

/** Ask at most this many times (initial + one follow-up) before concluding regardless of what's still missing. */
const MAX_INTAKE_ASKS = 2;

function union(existing: string[], added: string[]): string[] {
  return Array.from(new Set([...existing, ...added]));
}

function subtract(existing: string[], removed: string[]): string[] {
  const removedSet = new Set(removed);
  return existing.filter((id) => !removedSet.has(id));
}

/**
 * Deterministic ground-truth text: one sentence per risk (the same grounded
 * explanation `GET /risks/:id` has always produced) plus its precaution
 * tips, or a positive "no risks found" message. This is what V2.0.2 returns
 * as-is; V2.0.3 layers `composeAnswer` on top to rephrase it — the grounded
 * facts underneath are unchanged either way.
 */
function buildTemplateAnswer(groundedRisks: GroundedRisk[], unresolvedNames: string[]): string {
  const parts: string[] = [];
  if (groundedRisks.length === 0) {
    parts.push("Good news — I didn't find any flagged risks among what you've mentioned so far.");
  } else {
    for (const { explanation, tips } of groundedRisks) {
      parts.push(`${explanation} ${tips.join(" ")}`);
    }
  }
  if (unresolvedNames.length > 0) {
    parts.push(`I couldn't find ${unresolvedNames.join(", ")} in our records — could you check the spelling?`);
  }
  return parts.join("\n\n");
}

/**
 * Handles a message with nothing substantive to check — a greeting, small
 * talk, or a general health/pharmacology question. Falls back to a static
 * message on LLM failure, same NFR-007 shape as the `composeAnswer` fallback
 * below — never blocks the turn on a phrasing failure.
 */
async function answerGenerally(text: string, history: ConversationTurn[] | undefined, deps: RunTurnDeps, controls: StreamControls): Promise<string> {
  try {
    return await deps.llm.composeGeneralAnswer({ userMessage: text, history, ...controls });
  } catch {
    return "I didn't catch any medications, allergies, or conditions in that — could you mention them by name, or ask me a general question?";
  }
}

function prefixNotes(notes: string[], text: string): string {
  const note = notes.filter(Boolean).join(" ");
  return note ? `${note} ${text}` : text;
}

/**
 * Turns a category's resolved-vs-pending resolution outcome into the shared
 * `PendingClarification` shape, tagged with which catalog it's for and
 * whether it came from an addition or a removal (improvements.md #1.3/#1.4,
 * Build Plan V2.1.4/V2.1.5).
 */
function toPendingClarifications(category: ClarificationCategory, action: ClarificationAction, resolution: ReturnType<typeof resolveEntityNames>): PendingClarification[] {
  const pending: PendingClarification[] = [];
  for (const item of resolution.needsConfirmation) {
    pending.push({ category, action, kind: "confirm", queryName: item.queryName, candidate: item.candidate });
  }
  for (const item of resolution.ambiguous) {
    pending.push({ category, action, kind: "disambiguate", queryName: item.queryName, candidates: item.candidates });
  }
  return pending;
}

/**
 * Applies this turn's reply as an answer to last turn's pending
 * clarifications (improvements.md #1.3/#1.4) — deterministic, no LLM
 * judgment call, same reasoning as `detectEmergency`. Single-shot: an
 * unclear or "no" reply drops the item (with a note) rather than asking
 * again indefinitely.
 */
function interpretPendingClarifications(
  text: string,
  pending: PendingClarification[]
): { resolvedIds: Partial<Record<ClarificationCategory, { add: string[]; remove: string[] }>>; droppedNotes: string[] } {
  const resolvedIds: Partial<Record<ClarificationCategory, { add: string[]; remove: string[] }>> = {};
  const droppedNotes: string[] = [];

  function record(category: ClarificationCategory, action: ClarificationAction, id: string) {
    const bucket = (resolvedIds[category] ??= { add: [], remove: [] });
    bucket[action === "add" ? "add" : "remove"].push(id);
  }

  for (const item of pending) {
    if (item.kind === "confirm") {
      const answer = interpretYesNo(text);
      if (answer === true) {
        record(item.category, item.action, item.candidate.id);
      } else {
        droppedNotes.push(buildClarificationDroppedNote(item.queryName));
      }
    } else {
      const choice = pickDisambiguationChoice(text, item.candidates);
      if (choice) {
        record(item.category, item.action, choice.id);
      } else {
        droppedNotes.push(buildClarificationDroppedNote(item.queryName));
      }
    }
  }

  return { resolvedIds, droppedNotes };
}

/**
 * Emergency escalation (improvements.md #1.1, Build Plan V2.1.1, revised
 * per live user report) runs before anything else — including entity
 * extraction — so detection never depends on an LLM call succeeding, being
 * fast, or judging correctly. It no longer short-circuits the turn, though:
 * the user may have also said something clinically relevant in the same
 * breath ("I took aspirin and am facing tight throat" — possibly the drug
 * itself), so the fixed emergency notice is prefixed onto whatever the
 * normal pipeline below concludes, rather than replacing it. Every other
 * field (risks, intake state, pendingClarifications, notices, side
 * effects) is exactly what `runTurnInner` would have produced on its own.
 */
export async function runTurn(
  input: Parameters<typeof runTurnInner>[0],
  deps: RunTurnDeps
): Promise<TurnResult> {
  const emergency = detectEmergency(input.text);
  const result = await runTurnInner(input, deps);
  if (!emergency) return result;
  return {
    ...result,
    text: `${buildEmergencyResponse()}\n\n${result.text}`,
    isEmergency: true,
    emergencyCategory: emergency.category,
  };
}

/**
 * SD-009: the only module that calls an LLM, and only for two bounded
 * things — extracting entity names from free text, and (from the caller's
 * choice of whether to call composeAnswer) rephrasing an already-grounded
 * fact set. Every risk/severity/path fact comes from the unchanged
 * checkRisks/getRiskDetail pipeline (SD-004/SD-005) — this function adds no
 * new traversal or business rule of its own.
 */
async function runTurnInner(
  input: {
    patientId: string;
    text: string;
    history?: ConversationTurn[];
    intakeComplete: boolean;
    intakeAskCount: number;
    /** Cross-turn state the caller (chat-sessions) always supplies in production; optional here so a direct test call only needs to name the state it actually cares about. */
    pendingClarifications?: PendingClarification[];
    multiPersonNoticeShown?: boolean;
    dosageNoticeShown?: boolean;
    /**
     * Set by `regenerateLastMessage` (Build Plan V2.2.6) when the message
     * being regenerated was originally a grounded conclusion — bypasses the
     * "was there a real reason to check" gate from V2.1.11, since by the
     * time of a regenerate the session's intake/profile state has already
     * moved past what it was on the original turn (e.g. `intakeComplete` is
     * now true), which would otherwise silently reroute the SAME turn to
     * general chat instead of just re-phrasing the same grounded answer.
     */
    forceGroundedCheck?: boolean;
    /** Build Plan V2.2.0/V2.2.7 — see `StreamControls`. Applies to every LLM call this turn makes (extraction included), so a stop request halts the whole turn, not just the final compose call. */
    onChunk?: (delta: string) => void;
    signal?: AbortSignal;
  },
  deps: RunTurnDeps
): Promise<TurnResult> {
  const pendingClarificationsIn = input.pendingClarifications ?? [];
  const multiPersonNoticeShownIn = input.multiPersonNoticeShown ?? false;
  const dosageNoticeShownIn = input.dosageNoticeShown ?? false;
  const controls: StreamControls = { onChunk: input.onChunk, signal: input.signal };

  // One-time disclosures (improvements.md #1.10/#1.11, Build Plan
  // V2.1.9/V2.1.10) — deterministic pattern checks, fire at most once per
  // session. Collected now so they can prefix whatever text this turn ends
  // up returning, however it returns.
  const notes: string[] = [];
  const noticeFlags: Pick<TurnResult, "multiPersonNoticeShown" | "dosageNoticeShown"> = {};
  if (!multiPersonNoticeShownIn && detectMultiPersonMention(input.text)) {
    notes.push(buildMultiPersonNotice());
    noticeFlags.multiPersonNoticeShown = true;
  }
  if (!dosageNoticeShownIn && detectDosageMention(input.text)) {
    notes.push(buildDosageNotice());
    noticeFlags.dosageNoticeShown = true;
  }

  // Perf (improvements.md #2.3, Build Plan V2.2.2): the catalog reads don't
  // depend on the extraction result at all, so kick them off up front. They
  // now have to be awaited before extraction (not run concurrently with it)
  // because the off-topic gate right below needs the catalog names, and
  // that gate's entire point is to skip the LLM call — starting extraction
  // in parallel would spend the very tokens this gate exists to save.
  const [drugCatalog, allergenCatalog, diseaseCatalog] = await Promise.all([
    deps.assistantCatalog.listDrugs(),
    deps.assistantCatalog.listAllergens(),
    deps.assistantCatalog.listDiseases(),
  ]);

  // Off-topic gate (per the user's explicit request): a message with no
  // health/pharma signal at all, and not a reply the app itself is
  // specifically expecting right now (a pending clarification, or a
  // mid-intake follow-up answer), gets a fixed reply with NO LLM call —
  // no extraction, no compose, zero tokens spent. Skipped whenever a reply
  // is contextually on-topic by construction, regardless of its wording.
  const awaitingSpecificReply = pendingClarificationsIn.length > 0 || (!input.intakeComplete && input.intakeAskCount > 0);
  if (!awaitingSpecificReply && isLikelyOffTopic(input.text, [...drugCatalog, ...allergenCatalog, ...diseaseCatalog].map((c) => c.name))) {
    return { text: prefixNotes(notes, buildOffTopicResponse()), pendingClarifications: [], ...noticeFlags };
  }

  let extracted;
  try {
    extracted = await deps.llm.extractEntities({ message: input.text, history: input.history, signal: input.signal });
  } catch (err) {
    console.error("Extraction failed: ", err);
    return { text: "Sorry, I couldn't process that message — could you try rephrasing it?" };
  }

  const meds = resolveEntityNames(extracted.medications, drugCatalog);
  const allergies = resolveEntityNames(extracted.allergies, allergenCatalog);
  const conditions = resolveEntityNames(extracted.conditions, diseaseCatalog);
  const medsRemoved = resolveEntityNames(extracted.medicationsRemoved, drugCatalog);
  const allergiesRemoved = resolveEntityNames(extracted.allergiesRemoved, allergenCatalog);
  const conditionsRemoved = resolveEntityNames(extracted.conditionsRemoved, diseaseCatalog);

  const unresolvedNames = [...meds.unresolvedNames, ...allergies.unresolvedNames, ...conditions.unresolvedNames];

  // Resolve any clarification asked on the PRIOR turn using this turn's raw
  // text, deterministically (improvements.md #1.3/#1.4).
  const { resolvedIds: clarified, droppedNotes } = interpretPendingClarifications(input.text, pendingClarificationsIn);
  notes.push(...droppedNotes);

  function addsFor(category: ClarificationCategory, fromExtraction: string[]): string[] {
    return union(fromExtraction, clarified[category]?.add ?? []);
  }
  function removalsFor(category: ClarificationCategory, fromExtraction: string[]): string[] {
    return union(fromExtraction, clarified[category]?.remove ?? []);
  }

  // New clarifications raised THIS turn (a fresh fuzzy match or ambiguity) —
  // always overwrites whatever was pending before, since pending items are
  // single-shot (resolved above, one way or another, this same turn).
  const newPendingClarifications: PendingClarification[] = [
    ...toPendingClarifications("medications", "add", meds),
    ...toPendingClarifications("allergies", "add", allergies),
    ...toPendingClarifications("conditions", "add", conditions),
    ...toPendingClarifications("medications", "remove", medsRemoved),
    ...toPendingClarifications("allergies", "remove", allergiesRemoved),
    ...toPendingClarifications("conditions", "remove", conditionsRemoved),
  ];

  const currentProfile = await getPatient(input.patientId, { patients: deps.patients });
  const medicationIds = subtract(
    union(currentProfile.medicationIds, addsFor("medications", meds.resolvedIds)),
    removalsFor("medications", medsRemoved.resolvedIds)
  );
  const allergyIds = subtract(
    union(currentProfile.allergyIds, addsFor("allergies", allergies.resolvedIds)),
    removalsFor("allergies", allergiesRemoved.resolvedIds)
  );
  const conditionIds = subtract(
    union(currentProfile.conditionIds, addsFor("conditions", conditions.resolvedIds)),
    removalsFor("conditions", conditionsRemoved.resolvedIds)
  );

  const profileChanged =
    medicationIds.length !== currentProfile.medicationIds.length ||
    allergyIds.length !== currentProfile.allergyIds.length ||
    conditionIds.length !== currentProfile.conditionIds.length ||
    medicationIds.some((id) => !currentProfile.medicationIds.includes(id)) ||
    allergyIds.some((id) => !currentProfile.allergyIds.includes(id)) ||
    conditionIds.some((id) => !currentProfile.conditionIds.includes(id));

  if (profileChanged) {
    await updatePatient(
      input.patientId,
      { medicationIds, allergyIds, conditionIds },
      { patients: deps.patients, catalog: deps.patientCatalog }
    );
  }

  // A clarification question takes priority over the intake gate — resolving
  // WHICH drug was meant must happen before concluding anything about it.
  if (newPendingClarifications.length > 0) {
    return {
      text: prefixNotes(notes, buildClarificationQuestion(newPendingClarifications)),
      unresolvedNames: unresolvedNames.length > 0 ? unresolvedNames : undefined,
      pendingClarifications: newPendingClarifications,
      ...noticeFlags,
    };
  }

  const removedAnyThisTurn =
    (clarified.medications?.remove.length ?? 0) + (clarified.allergies?.remove.length ?? 0) + (clarified.conditions?.remove.length ?? 0) > 0 ||
    medsRemoved.resolvedIds.length > 0 ||
    allergiesRemoved.resolvedIds.length > 0 ||
    conditionsRemoved.resolvedIds.length > 0;

  const symptoms = extracted.symptoms.filter((s) => s.trim());
  const saidSomethingSubstantive =
    medicationIds.length > 0 ||
    allergyIds.length > 0 ||
    conditionIds.length > 0 ||
    symptoms.length > 0 ||
    removedAnyThisTurn ||
    extracted.medicationsDenied ||
    extracted.allergiesDenied ||
    extracted.conditionsDenied;

  // Intake gate (per the user's explicit request): the first time the user
  // says anything substantive — names a drug/allergy/condition, reports a
  // symptom, or confirms a category is empty — gather whichever of
  // medications/allergies/conditions aren't yet ANSWERED before drawing any
  // conclusion. "Answered" means a known entry OR an explicit "none", never
  // just silence — a reply that only addresses one of several asked
  // categories (e.g. "no allergies", leaving conditions unaddressed) gets a
  // targeted follow-up, up to MAX_INTAKE_ASKS total, before giving up and
  // concluding on whatever's known.
  if (!input.intakeComplete) {
    if (input.intakeAskCount === 0 && !saidSomethingSubstantive) {
      // Nothing worth gathering yet — don't burn an intake question on it.
      // A genuinely unresolved name still gets its specific message; anything
      // else (a greeting, small talk, a general question) gets a real
      // conversational reply instead of a canned "didn't catch" string.
      return {
        text: prefixNotes(
          notes,
          unresolvedNames.length > 0
            ? `I couldn't find ${unresolvedNames.join(", ")} in our records — could you check the spelling or try a different name?`
            : await answerGenerally(input.text, input.history, deps, controls)
        ),
        unresolvedNames: unresolvedNames.length > 0 ? unresolvedNames : undefined,
        answerSource: unresolvedNames.length > 0 ? undefined : "general",
        pendingClarifications: [],
        ...noticeFlags,
      };
    }

    const answeredMedications = medicationIds.length > 0 || extracted.medicationsDenied;
    const answeredAllergies = allergyIds.length > 0 || extracted.allergiesDenied;
    const answeredConditions = conditionIds.length > 0 || extracted.conditionsDenied;
    const stillMissing = !answeredMedications || !answeredAllergies || !answeredConditions;

    if (stillMissing && input.intakeAskCount < MAX_INTAKE_ASKS) {
      return {
        text: prefixNotes(
          notes,
          buildIntakeQuestion(
            { hasMedications: answeredMedications, hasAllergies: answeredAllergies, hasConditions: answeredConditions },
            symptoms,
            input.intakeAskCount > 0
          )
        ),
        unresolvedNames: unresolvedNames.length > 0 ? unresolvedNames : undefined,
        intakeAskCount: input.intakeAskCount + 1,
        pendingClarifications: [],
        ...noticeFlags,
      };
    }
    // Either everything's now answered, or we've already asked
    // MAX_INTAKE_ASKS times — stop asking and conclude on what's known.
  }

  // True only on the turn that transitions out of gathering (whether by a
  // full answer or hitting the retry cap) — the caller persists this once.
  const justCompletedIntake = !input.intakeComplete || undefined;

  if (medicationIds.length === 0 && allergyIds.length === 0 && conditionIds.length === 0) {
    return {
      text: prefixNotes(
        notes,
        symptoms.length > 0
          ? buildGenericSymptomTemplate(symptoms)
          : unresolvedNames.length > 0
          ? `I couldn't find ${unresolvedNames.join(", ")} in our records — could you check the spelling or try a different name?`
          : await answerGenerally(input.text, input.history, deps, controls)
      ),
      unresolvedNames: unresolvedNames.length > 0 ? unresolvedNames : undefined,
      intakeJustCompleted: justCompletedIntake,
      answerSource: symptoms.length > 0 || unresolvedNames.length > 0 ? undefined : "general",
      pendingClarifications: [],
      ...noticeFlags,
    };
  }

  // Bugfix (reported live, V2.1 addendum): once a profile has real data, EVERY
  // later message used to fall through to the full grounded pipeline below,
  // regardless of what it actually asked — a definitional follow-up like
  // "what is bruising" or "what is a pain reliever" got re-labeled "grounded"
  // and re-decorated with severity badges for an interaction it never asked
  // about. Only re-run the real check when there's an actual reason to: new
  // info this turn, the turn that just finished intake (the first real
  // conclusion), or the user explicitly asking about their own risk/status.
  // Otherwise it's a follow-up general question — answered with full
  // conversation history so it can still naturally reference the prior
  // conclusion, just without re-asserting it as a fresh checked result.
  const hasNewInfoThisTurn = profileChanged || symptoms.length > 0;
  if (!hasNewInfoThisTurn && !justCompletedIntake && !extracted.wantsRiskRecheck && !input.forceGroundedCheck) {
    return {
      text: prefixNotes(
        notes,
        unresolvedNames.length > 0
          ? `I couldn't find ${unresolvedNames.join(", ")} in our records — could you check the spelling or try a different name?`
          : await answerGenerally(input.text, input.history, deps, controls)
      ),
      unresolvedNames: unresolvedNames.length > 0 ? unresolvedNames : undefined,
      answerSource: unresolvedNames.length > 0 ? undefined : "general",
      pendingClarifications: [],
      ...noticeFlags,
    };
  }

  const riskCheckDeps: RiskCheckDeps = {
    interactions: deps.interactions,
    allergyLinks: deps.allergyLinks,
    contraindications: deps.contraindications,
    patientProfile: { getProfile: async (id: string) => (id === input.patientId ? { medicationIds, allergyIds, conditionIds } : undefined) },
  };
  const risks = await checkRisks({ patientId: input.patientId }, riskCheckDeps);

  const groundedRisks: GroundedRisk[] = [];
  for (const risk of risks) {
    const detail = await getRiskDetail(risk.id, input.patientId, {
      interactions: deps.interactions,
      allergyLinks: deps.allergyLinks,
      contraindications: deps.contraindications,
      patients: deps.explanationPatients,
    });

    let explanation = detail.explanation;
    const tips = getPrecautions(risk.type, risk.severity);

    // Demo-data enrichment (Build Plan V2.0 addendum): if this specific
    // interaction pair carries an authored risk description/tip (from the
    // import CSV's `risks`/`tips` columns), lead with that — it's still
    // fully grounded, since it's data stored on the interaction edge itself,
    // not something the LLM introduces. The generic severity/type tips stay
    // as a fallback/supplement, not a replacement.
    if (risk.type === "interaction") {
      const interaction = await deps.interactions.findById(risk.id);
      if (interaction?.riskDescription) {
        explanation = `${explanation} ${interaction.riskDescription}`;
      }
      if (interaction?.tip) {
        tips.unshift(interaction.tip);
      }
    }

    groundedRisks.push({ risk, explanation, tips });
  }

  const templateAnswer = buildTemplateAnswer(groundedRisks, unresolvedNames);
  let answerText = templateAnswer;
  try {
    const composeInput: ComposeAnswerInput = {
      userMessage: input.text,
      groundedRisks,
      unresolvedNames,
      symptoms: symptoms.length > 0 ? symptoms : undefined,
      history: input.history,
      ...controls,
    };
    answerText = await deps.llm.composeAnswer(composeInput);
  } catch {
    // Fall back to the deterministic template — never block on LLM phrasing
    // when the grounded facts themselves are already available (NFR-007).
    answerText = templateAnswer;
  }

  try {
    await recordQuery(
      {
        id: deps.newId(),
        queryType: "chat",
        patientId: input.patientId,
        inputSummary: { patientId: input.patientId },
        resultSummary: summarizeResult(risks),
        createdAt: deps.now(),
      },
      { queryLog: deps.queryLog }
    );
  } catch (err) {
    console.error("Failed to record chat query log entry (non-fatal):", err);
  }

  return {
    text: prefixNotes(notes, answerText),
    risks,
    tips: groundedRisks.flatMap((g) => g.tips),
    unresolvedNames: unresolvedNames.length > 0 ? unresolvedNames : undefined,
    intakeJustCompleted: justCompletedIntake,
    answerSource: "grounded",
    pendingClarifications: [],
    ...noticeFlags,
  };
}
