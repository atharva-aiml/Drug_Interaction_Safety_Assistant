/**
 * Deliberately pattern-based, not a general classifier — same precedent as
 * `emergencyDetection.ts`/`data-import/domain/importValidation.ts`'s
 * `detectPII`: catches messages with no health/pharma signal at all so they
 * can get a fixed reply without spending an LLM call, at the cost of not
 * covering every possible on-topic phrasing. Deliberately conservative:
 * treats anything ambiguous as ON-topic and lets the real pipeline handle
 * it — refusing a genuine health question would be a worse failure than
 * occasionally letting an off-topic one reach the LLM.
 */
const HEALTH_KEYWORDS = [
  // core domain nouns
  "drug", "medication", "medicine", "pill", "tablet", "capsule",
  "dose", "dosage", "prescri", "pharmac", "side effect", "side-effect",
  "interact", "allerg", "condition", "diagnos", "symptom", "disease", "illness",
  "medical", "health", "doctor", "physician", "clinic", "hospital", "nurse",
  "treatment", "therapy", "overdose", "contraindicat", "supplement", "vitamin",
  "injection", "vaccine", "antibiotic", "painkiller", "steroid", "insulin",
  // common symptom/body/effect words
  "pain", "ache", "fever", "nausea", "nauseous", "vomit", "dizzy", "dizziness",
  "rash", "swelling", "swollen", "headache", "migraine", "stomach", "cough",
  "cold", "flu", "infection", "bleeding", "breath", "sick", "unwell", "tired",
  "fatigue", "drowsy", "sleepy", "insomnia", "appetite", "weight", "mood",
  "anxious", "anxiety", "depress", "blood pressure", "blood sugar", "glucose",
  "liver", "kidney", "heart rate", "heartbeat", "numb", "tingling", "itch", "blood",
  "hives", "seizure", "faint", "unconscious", "chest", "bruis",
  // words central to this app's own domain vocabulary
  "risk", "safe", "safety", "worried", "worry", "concern",
  // conversational verbs tied to taking/using medication
  "taking", "took", "take", "prescribed",
] as const;

/** Very short or purely acknowledging replies — needed for ongoing intake/clarification flows, never the target of this gate. */
const SHORT_REPLY_ALLOWLIST = new Set([
  "yes", "y", "no", "n", "none", "na", "n/a", "ok", "okay", "sure", "yep", "yeah", "nope",
]);

/**
 * Prefixes/phrasings for small talk and greetings DIRECTED AT THE ASSISTANT
 * ("hi", "thanks for the help", "what can you do") — the existing
 * general-chat system prompt already has its own rule for handling these
 * warmly, so this gate must not intercept them even though they carry no
 * health keyword. What this gate exists to catch is a genuinely unrelated
 * factual/trivia question ("who is the prime minister of India") that has
 * neither a health signal nor this conversational-address signal.
 */
const CONVERSATIONAL_PREFIXES = ["hi", "hello", "hey", "thanks", "thank you", "thx", "greetings"];

/** A message addressing the assistant itself ("how are you", "what can you do") reads as small talk, not a trivia lookup. */
const ADDRESSES_ASSISTANT_PATTERN = /\byou\b|\byour\b/i;

/**
 * True when `text` has no detectable health/pharma signal, no catalog name,
 * and no sign of being small talk directed at the assistant — i.e. it reads
 * like an unrelated factual/trivia question. `catalogNames` should be the
 * union of all three catalogs so a bare drug/allergen/condition name with no
 * other wording (e.g. a short clarification reply) still counts as on-topic.
 */
export function isLikelyOffTopic(text: string, catalogNames: string[] = []): boolean {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed || trimmed.length <= 3) return false; // too short to judge — never the trigger for this gate
  if (SHORT_REPLY_ALLOWLIST.has(trimmed)) return false;
  if (CONVERSATIONAL_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return false;
  if (ADDRESSES_ASSISTANT_PATTERN.test(trimmed)) return false;

  for (const keyword of HEALTH_KEYWORDS) {
    if (trimmed.includes(keyword)) return false;
  }
  for (const name of catalogNames) {
    const normalized = name?.trim().toLowerCase();
    if (normalized && trimmed.includes(normalized)) return false;
  }
  return true;
}

/**
 * Fixed, deterministic response text — never LLM-composed, so an off-topic
 * message costs zero LLM tokens. Same reasoning as `buildEmergencyResponse`:
 * a boundary message that always reads the same is more trustworthy than
 * one an LLM might phrase (or fail to enforce) differently turn to turn.
 */
export function buildOffTopicResponse(): string {
  return (
    "I'm here to help with health-related questions, particularly regarding drug interactions, allergies, " +
    "and conditions. If you have a question about medications or health, feel free to ask!"
  );
}
