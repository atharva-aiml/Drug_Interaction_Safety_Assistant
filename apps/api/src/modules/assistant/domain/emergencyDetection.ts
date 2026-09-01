export interface EmergencyMatch {
  category: string;
  matchedPhrase: string;
}

interface EmergencyPattern {
  category: string;
  pattern: RegExp;
}

/**
 * Deliberately pattern-based, not a general classifier — same precedent as
 * `data-import/domain/importValidation.ts`'s `detectPII`: a fixed set of
 * regexes catches the phrasings it's been given, not every possible way to
 * describe an emergency. Documented as a real limitation, not glossed over.
 */
const EMERGENCY_PATTERNS: EmergencyPattern[] = [
  { category: "breathing difficulty", pattern: /\b(can'?t|cannot|difficulty|trouble|struggling to)\s+breath(e|ing)\b/i },
  { category: "breathing difficulty", pattern: /\b(shortness of breath|short of breath|loss of breath|breath(less|\s+shortage)|can'?t catch (my |your )?breath)\b/i },
  { category: "breathing difficulty", pattern: /\bthroat\s+(is\s+|are\s+|feels\s+)?(closing|swelling shut|swollen shut|tight|tightening|tightness)\b/i },
  { category: "breathing difficulty", pattern: /\btight\s+throat\b/i },
  { category: "allergic reaction", pattern: /\b(anaphylax(is|tic)|severe allergic reaction)\b/i },
  { category: "allergic reaction", pattern: /\b(face|lips|tongue|throat)\s+(is\s+|are\s+)?swelling\b/i },
  { category: "chest pain", pattern: /\bchest\s+(pain|tightness|pressure|crushing)\b/i },
  // Rapid/irregular heart rate — also a classic serotonin-syndrome sign this
  // assistant's own risk explanations already warn about, so a user later
  // reporting exactly that symptom must be caught, not just the drug pair.
  { category: "rapid heart rate", pattern: /\b(my\s+)?(heart|pulse)\s*(rate)?\s*(is\s+|feels?\s+|seems?\s+)?(racing|pounding|beating (really |very |so )?(fast|quickly|rapidly)|too fast|abnormally (high|fast)|very high|really fast|very fast|high|elevated|irregular|skipping)\b/i },
  { category: "rapid heart rate", pattern: /\b(racing|pounding|rapid|fast|high|elevated|irregular)\s+(heart\s*(rate|beat)?|pulse)\b/i },
  { category: "rapid heart rate", pattern: /\b(tachycardia|palpitations?)\b/i },
  // Possible stroke — deliberately narrow to the well-known F.A.S.T. warning
  // signs (face, arm/speech, sudden onset) rather than generic weakness.
  { category: "possible stroke", pattern: /\b(face|mouth)\s+(is\s+|feels?\s+)?droop(ing)?\b/i },
  { category: "possible stroke", pattern: /\bslurr(ed|ing)\s+(my\s+|your\s+)?(speech|words)\b/i },
  { category: "possible stroke", pattern: /\b(sudden|one[- ]sided)\s+(numbness|weakness)\b/i },
  { category: "possible stroke", pattern: /\bcan'?t move (my )?(arm|leg|one side)\b/i },
  { category: "possible stroke", pattern: /\bworst headache (of my life|i'?ve ever had|ever)\b/i },
  { category: "fainting", pattern: /\b(feel(ing)? like (i'?m going to |i might )?faint|about to faint|going to pass out|feel faint)\b/i },
  { category: "fainting", pattern: /\b(severe|extreme(ly)?)\s+dizz(y|iness)\b/i },
  // High fever and severe rigidity/tremor — the rest of the serotonin-syndrome/
  // neuroleptic-malignant-syndrome triad alongside rapid heart rate above.
  { category: "high fever", pattern: /\b(high|raging|burning)\s+fever\b|\bburning up\b|\b(very|extremely|dangerously)\s+high\s+(fever|temperature)\b/i },
  {
    category: "severe muscle rigidity or shaking",
    pattern: /\b(uncontrollable|severe)\s+(shaking|tremor|trembling)\b|\b(shaking|trembling)\s+uncontrollably\b|\bmuscles?\s+(are\s+|feel\s+|seem\s+)?(completely\s+|totally\s+)?(rigid|stiff|locked)\b/i,
  },
  { category: "unresponsiveness", pattern: /\b(unconscious|unresponsive|won'?t wake up|can'?t stay awake|passed out)\b/i },
  { category: "seizure", pattern: /\b(seizure|convulsing|convulsions)\b/i },
  { category: "overdose", pattern: /\b(overdose|took too many (pills|tablets|medications)|took too much (medication|medicine))\b/i },
  { category: "uncontrolled bleeding", pattern: /\b(bleeding (that )?won'?t stop|won'?t stop bleeding|severe bleeding)\b/i },
  { category: "cyanosis", pattern: /\b(turning blue|blue lips|lips (are |turning )?blue)\b/i },
  { category: "self-harm risk", pattern: /\b(suicidal|want to (die|kill myself)|kill myself|hurt myself)\b/i },
];

/**
 * Deterministic, non-LLM emergency-symptom detection (improvements.md #1.1 / Build Plan V2.1.1).
 * Must run before anything else in a turn — including entity extraction —
 * so escalation never depends on an LLM's judgment call. Pure, no I/O.
 */
export function detectEmergency(message: string): EmergencyMatch | undefined {
  for (const { category, pattern } of EMERGENCY_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return { category, matchedPhrase: match[0] };
    }
  }
  return undefined;
}

/**
 * Fixed, deterministic response text — never LLM-composed. A safety-critical
 * escalation message must not vary turn to turn or be subject to prompt
 * drift, so it takes no input and always returns the same text.
 *
 * Invariant `runTurn` and the web `MessageBubble` both rely on: this text is
 * always a single paragraph with no blank line in it. `runTurn` prefixes it
 * onto the turn's normal-flow continuation joined by exactly one blank line
 * ("\n\n"), and the frontend splits the persisted message on the FIRST blank
 * line to separate this fixed notice (shown in its own highlighted section)
 * from the continuation (shown as an ordinary reply right below it) — so
 * this string must never itself contain "\n\n".
 */
export function buildEmergencyResponse(): string {
  return (
    "This sounds like it could be a medical emergency. Please call your local emergency number " +
    "(e.g. 911 in the US, 999 in the UK, 112 in the EU, 112 or 108 in India) or go to the nearest emergency room right away. " +
    "Do not wait to see if it passes. " +
    "This assistant can't provide emergency care and shouldn't be used in place of it."
  );
}
