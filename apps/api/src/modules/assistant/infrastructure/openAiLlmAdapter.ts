import { config } from "../../../config.js";
import {
  ComposeAnswerInput,
  ComposeGeneralAnswerInput,
  ConversationTurn,
  ExtractedEntities,
  ExtractionFailedError,
  LlmPort,
  StreamControls,
} from "../application/ports.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

/** Appended to the extraction system prompt so Groq's JSON mode has an explicit schema to fill. */
const EXTRACTION_JSON_INSTRUCTION = `Respond with ONLY a JSON object (no markdown, no commentary) with exactly these keys:
- "medications", "allergies", "conditions", "symptoms", "medicationsRemoved", "allergiesRemoved", "conditionsRemoved": arrays of strings (use [] when none apply).
- "medicationsDenied", "allergiesDenied", "conditionsDenied", "wantsRiskRecheck": booleans.`;

const EXTRACTION_SYSTEM_PROMPT = `You are an entity extractor for a drug-interaction-safety assistant.
Given the conversation so far and the user's latest message, extract:

- medications: medication names explicitly mentioned as something the user takes or is asking about. If the user mentions a medication ONLY to say they are allergic to it, put it in allergies, NOT here.
- allergies: allergy/allergen names explicitly mentioned (including drugs the user says they are allergic to).
- conditions: previously-diagnosed conditions the user says they HAVE (e.g. "I have Chronic Kidney
  Disease") Ã¢â‚¬â€ not a symptom they are currently experiencing right now.
- symptoms: a symptom or complaint the user is currently experiencing or reporting (e.g. "nose
  bleeding", "nausea", "feeling dizzy", "a rash"). A symptom is NEVER also listed under conditions Ã¢â‚¬â€
  it's what the user feels, not a diagnosis they already have.
- medicationsDenied / allergiesDenied / conditionsDenied: three INDEPENDENT booleans. Set one true
  ONLY if the user's own words contain an explicit negation (e.g. "no", "none", "I don't have any",
  "not on anything") that specifically refers to THAT category. Judge each of the three separately Ã¢â‚¬â€
  do not let a positive answer to one category influence the other two, and do not set a field true
  just because the message didn't mention that category (silence is false, not denial).

  Worked examples (the assistant had just asked about both allergies and conditions):
  - "no allergies" Ã¢â€ â€™ allergiesDenied: true, conditionsDenied: false (conditions wasn't addressed at
    all Ã¢â‚¬â€ silence, not denial).
  - "I have a penicillin allergy" Ã¢â€ â€™ allergiesDenied: false (a positive statement, not a denial),
    conditionsDenied: false (still not addressed Ã¢â‚¬â€ a positive answer about allergies is NOT evidence
    that conditions is empty).
  - "no allergies or conditions" Ã¢â€ â€™ both true Ã¢â‚¬â€ each explicitly denied in the same sentence.
  - "none" (replying to a question about two categories) Ã¢â€ â€™ both true, since the bare denial applies to
    everything the question asked about.

Use conversation history to interpret short replies in context, but a "Denied" field may only become
true because of an actual negation in the user's own words Ã¢â‚¬â€ context alone never sets it true.

- medicationsRemoved / allergiesRemoved / conditionsRemoved: names the user says they no longer
  take/have RIGHT NOW (e.g. "I stopped taking aspirin", "remove my penicillin allergy", "I don't have
  that condition anymore"). Distinct from "Denied" Ã¢â‚¬â€ a denial means "I never had this", a removal means
  "I used to have this and no longer do". A name mentioned as newly started is never also listed as
  removed in the same message.
- wantsRiskRecheck: true ONLY if the user is explicitly asking about THEIR OWN risk/safety/status with
  their current medications/allergies/conditions (e.g. "am I still at risk?", "is this safe for me?",
  "check again", "what about my aspirin and warfarin?"). False for a general or definitional question
  that does not ask about their own personal situation (e.g. "what is bruising?", "what is a blood
  thinner?", "what is a pain reliever?") Ã¢â‚¬â€ even if it uses similar words to something already
  discussed. When unsure, prefer false: a personalized recheck should be explicitly requested, not
  inferred from topic overlap alone.

Use the user's own wording for each name Ã¢â‚¬â€ do not correct spelling, normalize capitalization, or infer
a brand/generic equivalent the user didn't say. Return an empty array for any category not mentioned.
Do not include dosages, frequencies, or unrelated words.`;

const COMPOSE_SYSTEM_PROMPT = `You are a medication-safety assistant. You will be given a set of
ALREADY-VERIFIED facts (each risk's type, severity, a grounded explanation sentence, and precaution
tips), any names the user mentioned that couldn't be found in the catalog, and optionally the symptom(s)
the user reported. Rephrase these into a warm, clear, conversational answer to the user's question.

Rules Ã¢â‚¬â€ follow exactly:
1. Only use the facts given to you. Never mention a drug, allergy, condition, or relationship that
   isn't in the provided list Ã¢â‚¬â€ do not add outside medical knowledge about specific drugs.
2. Cover every listed risk and its precaution tips (you may combine/reorder sentences naturally).
3. If the risk list is empty, reassure the user clearly and positively.
4. If any names are listed as not found, mention them briefly and ask the user to double-check the
   spelling. Do not assume or state which specific catalog (e.g., "medication catalog") they were missing from, just say "our records".
5. If symptoms are provided, explicitly address whether the listed risks (or their absence) could
   relate to the reported symptom(s) Ã¢â‚¬â€ using only the given facts. If no risk relates to the symptom,
   say so plainly rather than implying a connection that isn't in the data.
6. Never state a clinical diagnosis or give medical advice beyond the tips provided Ã¢â‚¬â€ for anything
   serious, suggest consulting a healthcare professional. If you (in an earlier turn, visible in the
   conversation history below) already told the user to consult a healthcare professional about this
   same ongoing risk, don't repeat that reminder verbatim again this turn Ã¢â‚¬â€ a closing safety line said
   every single turn reads as robotic filler, not caution. Still include it the first time a given risk
   is raised, and always include it for a NEW risk that hasn't been mentioned before.
7. Match the length to the content, don't pad every answer to the same size: a "no risks found"
   reassurance can be a single short sentence; one moderate/minor risk is usually 2-3 sentences; only a
   severe/contraindicated risk, multiple risks, or a symptom tie-in needs the fuller 4-6 sentences this
   used to always default to.
8. You may also see earlier turns of this conversation, for tone and continuity (e.g. referring back
   to something already discussed, not repeating yourself unnecessarily). They are NOT a source of
   facts Ã¢â‚¬â€ every risk/interaction claim must still come only from the ALREADY-VERIFIED facts in the
   final message. Never treat something said in an earlier turn (including your own prior replies) as
   a new fact to assert.`;

const GENERAL_CHAT_SYSTEM_PROMPT = `You are a friendly assistant for a drug-interaction-safety app. The
user's message doesn't name any specific medication, allergy, or condition to check Ã¢â‚¬â€ it's likely a
greeting, small talk, or a general question about health or pharmacology.

Rules:
1. Greetings/small talk: respond warmly and briefly. You may mention, briefly and not on every single
   turn, that you can check for drug interactions, allergy conflicts, or contraindications once the
   user names their medications, allergies, or conditions.
2. General health/pharmacology knowledge questions (e.g. "what is a blood thinner?", "what does NSAID
   stand for?"): answer with accurate, general, textbook-level knowledge. This is fine even though
   it isn't grounded in this app's own data, since it's general knowledge, not a personalized claim.
3. Never state or imply a conclusion about the user's OWN personal risk, medications, or health
   situation Ã¢â‚¬â€ no data has been checked in this turn. If the message sounds like it wants personalized
   information ("is my medication safe?", "am I at risk?"), do not guess Ã¢â‚¬â€ ask the user to name their
   specific medications, allergies, or conditions so a real check can run.
4. Never provide a clinical diagnosis or specific treatment advice Ã¢â‚¬â€ for anything medical or serious,
   suggest consulting a healthcare professional.
5. Keep it concise: 1-3 sentences for a greeting, a bit more only for a genuine informational question.
6. You may see earlier turns of this conversation Ã¢â‚¬â€ use them for continuity and tone, and to avoid
   repeating yourself, but they still never justify a personalized claim under rule 3.`;

const TITLE_SYSTEM_PROMPT = `Summarize the user's message into a short chat session title, 3-6 words.
No trailing punctuation, no quotation marks, no leading "Chat about" or similar filler Ã¢â‚¬â€ just the topic
itself (e.g. "Aspirin and warfarin interaction", "Penicillin allergy question"). If the message is a
greeting or too vague to summarize meaningfully, respond with "New chat".`;

const HISTORY_SUMMARY_SYSTEM_PROMPT = `You maintain a running summary of an ongoing conversation with a
drug-interaction-safety assistant, so older turns can be dropped from the active context without losing
continuity. You will be given the EXISTING summary (empty if this is the first time) and the next batch
of older messages to fold into it.

Rules:
1. Produce an updated summary, 2-4 sentences, third person, factual Ã¢â‚¬â€ what topics, medications,
   allergies, or conditions have come up, and what conclusions were already given.
2. Never introduce a new medical claim, risk, or interaction that wasn't already stated in the messages
   themselves Ã¢â‚¬â€ this summary is for conversational continuity only, never a source of new facts.
3. Keep names/terms as they appeared; don't invent detail that wasn't there.
4. Return ONLY the summary text, no preamble.`;

function toGroqHistory(history: ConversationTurn[] | undefined): GroqMessage[] {
  if (!history) return [];
  return history.map((turn) => ({ role: turn.role === "assistant" ? "assistant" : "user", content: turn.text }));
}

/**
 * Real `LlmPort` implementation (SD-009's only external dependency).
 */
export class OpenAiLlmAdapter implements LlmPort {
  private readonly keys = config.groqApiKeys;
  // Which key to try first; advances when a key hits a rate limit or auth
  // failure so we stop hammering an exhausted/invalid free-tier key.
  private keyIndex = 0;

  /** POST to Groq, rotating through the configured keys on 429/401/403 or network failure. */
  private async fetchWithRotation(body: Record<string, unknown>, signal?: AbortSignal): Promise<globalThis.Response> {
    const errors: string[] = [];
    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      const keyIdx = (this.keyIndex + attempt) % this.keys.length;
      let res: globalThis.Response;
      try {
        res = await fetch(GROQ_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.keys[keyIdx]}` },
          body: JSON.stringify(body),
          signal,
        });
      } catch (err) {
        if (signal?.aborted) throw err;
        errors.push(`key #${keyIdx + 1}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      if (res.status === 429 || res.status === 401 || res.status === 403) {
        errors.push(`key #${keyIdx + 1}: HTTP ${res.status}`);
        this.keyIndex = (keyIdx + 1) % this.keys.length; // move past the exhausted/invalid key
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Groq HTTP ${res.status}: ${text.slice(0, 300)}`);
      }
      this.keyIndex = keyIdx; // this key worked — start here next time
      return res;
    }
    throw new Error(`All Groq keys failed: ${errors.join("; ")}`);
  }

  /** Parse Groq's SSE stream, forwarding each token delta to `onChunk` and returning the full text. */
  private async readStream(res: globalThis.Response, onChunk: (delta: string) => void, signal?: AbortSignal): Promise<string> {
    const reader = res.body?.getReader();
    if (!reader) throw new Error("Groq stream had no body");
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    while (true) {
      if (signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            full += delta;
            onChunk(delta);
          }
        } catch {
          // keep-alive comment or a frame split across reads — the next read completes it
        }
      }
    }
    if (!full) throw new Error("Groq stream returned no content");
    return full;
  }

  /** Non-streaming Groq chat call returning the full message content. */
  private async chat(model: string, messages: GroqMessage[], opts?: { jsonMode?: boolean; signal?: AbortSignal }): Promise<string> {
    const body: Record<string, unknown> = { model, messages, temperature: 0.4 };
    if (opts?.jsonMode) body.response_format = { type: "json_object" };
    const res = await this.fetchWithRotation(body, opts?.signal);
    const content = (await res.json())?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content) throw new Error("Groq returned no content");
    return content;
  }

  async extractEntities(input: { message: string; history?: ConversationTurn[]; signal?: AbortSignal }): Promise<ExtractedEntities> {
    let content: string;
    try {
      content = await this.chat(
        config.openaiExtractionModel,
        [
          { role: "system", content: `${EXTRACTION_SYSTEM_PROMPT}\n\n${EXTRACTION_JSON_INSTRUCTION}` },
          ...toGroqHistory(input.history),
          { role: "user", content: input.message },
        ],
        { jsonMode: true, signal: input.signal }
      );
    } catch (err) {
      throw new ExtractionFailedError(err instanceof Error ? err.message : "Groq extraction request failed");
    }

    try {
      const parsed = JSON.parse(content) as Partial<ExtractedEntities>;
      return {
        medications: Array.isArray(parsed.medications) ? parsed.medications : [],
        allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
        conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
        symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
        medicationsDenied: parsed.medicationsDenied === true,
        allergiesDenied: parsed.allergiesDenied === true,
        conditionsDenied: parsed.conditionsDenied === true,
        medicationsRemoved: Array.isArray(parsed.medicationsRemoved) ? parsed.medicationsRemoved : [],
        allergiesRemoved: Array.isArray(parsed.allergiesRemoved) ? parsed.allergiesRemoved : [],
        conditionsRemoved: Array.isArray(parsed.conditionsRemoved) ? parsed.conditionsRemoved : [],
        wantsRiskRecheck: parsed.wantsRiskRecheck === true,
      };
    } catch (err) {
      throw new ExtractionFailedError("GenAI extraction returned unparseable JSON");
    }
  }

  /**
   * Shared streaming call for both compose methods (Build Plan V2.2.0):
   * streams token deltas to `onChunk` as they arrive when given, otherwise
   * makes the original non-streaming request unchanged. Either way returns
   * the full accumulated text. `signal` (V2.2.7) aborts the request Ã¢â‚¬â€ the
   * SDK rejects the call the same way any other network failure would, so
   * callers don't need special-case handling for "stopped" vs. "failed".
   */
  private async runChatCompletion(
    systemPrompt: string,
    userContent: string,
    controls: StreamControls & { history?: ConversationTurn[] }
  ): Promise<string> {
    const messages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      ...toGroqHistory(controls.history),
      { role: "user", content: userContent },
    ];

    if (!controls.onChunk) {
      const text = await this.chat(config.openaiModel, messages, { signal: controls.signal });
      return text.trim();
    }

    const body: Record<string, unknown> = { model: config.openaiModel, messages, temperature: 0.4, stream: true };
    const res = await this.fetchWithRotation(body, controls.signal);
    const full = await this.readStream(res, controls.onChunk, controls.signal);
    return full.trim();
  }

  async composeAnswer(input: ComposeAnswerInput): Promise<string> {
    const factsPayload = JSON.stringify(
      {
        userQuestion: input.userMessage,
        risks: input.groundedRisks.map((g) => ({
          type: g.risk.type,
          severity: g.risk.severity,
          explanation: g.explanation,
          tips: g.tips,
        })),
        namesNotFound: input.unresolvedNames,
        ...(input.symptoms ? { reportedSymptoms: input.symptoms } : {}),
      },
      null,
      2
    );

    return this.runChatCompletion(COMPOSE_SYSTEM_PROMPT, factsPayload, input);
  }

  async composeGeneralAnswer(input: ComposeGeneralAnswerInput): Promise<string> {
    return this.runChatCompletion(GENERAL_CHAT_SYSTEM_PROMPT, input.userMessage, input);
  }

  async generateTitle(input: { userMessage: string; signal?: AbortSignal }): Promise<string> {
    const content = await this.chat(
      config.openaiExtractionModel,
      [
        { role: "system", content: TITLE_SYSTEM_PROMPT },
        { role: "user", content: input.userMessage },
      ],
      { signal: input.signal }
    );
    return content.trim();
  }

  async summarizeHistory(input: { existingSummary: string; olderMessages: ConversationTurn[]; signal?: AbortSignal }): Promise<string> {
    const payload = JSON.stringify(
      { existingSummary: input.existingSummary || "(none yet)", olderMessages: input.olderMessages },
      null,
      2
    );
    const content = await this.chat(
      config.openaiExtractionModel,
      [
        { role: "system", content: HISTORY_SUMMARY_SYSTEM_PROMPT },
        { role: "user", content: payload },
      ],
      { signal: input.signal }
    );
    return content.trim();
  }
}
