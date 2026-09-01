/**
 * Two known, intentional limitations of this assistant (improvements.md
 * #1.10/#1.11, Build Plan V2.1.9/V2.1.10) that should be disclosed to the
 * user rather than discovered by accident:
 *  - it tracks exactly one person's medications/allergies/conditions per
 *    session, never several people at once ("my daughter takes X, I take Y");
 *  - it never factors dosage or frequency into a risk check, only which
 *    drugs/allergies/conditions are involved.
 * Both detectors are deterministic pattern checks, not an LLM judgment —
 * same reasoning as `detectEmergency`: whether a disclosure is owed
 * shouldn't depend on a model noticing. Each fires at most once per session
 * (the caller persists a one-time-shown flag) so it reads as a helpful
 * heads-up, not a repeated interruption.
 */

const MULTI_PERSON_PATTERN =
  /\b(my|our)\s+(mom|mother|dad|father|son|daughter|husband|wife|spouse|partner|child|kid|kids|parent|grandmother|grandfather|grandma|grandpa|friend|sister|brother)\b[^.?!]{0,60}\b(take|takes|taking|allerg|allergic|condition|diagnos|medication|prescri)/i;

export function detectMultiPersonMention(message: string): boolean {
  return MULTI_PERSON_PATTERN.test(message);
}

export function buildMultiPersonNotice(): string {
  return (
    "Just so you know: I can only track one person's medications, allergies, and conditions per chat. " +
    "If you're asking about someone else, please start a separate chat for them so the two profiles don't mix."
  );
}

const DOSAGE_PATTERN = /\b\d+\s?(mg|mcg|ml|g|units?)\b|\b(once|twice|three times|four times)\s+(a|per)\s+day\b|\bevery\s+\d+\s+hours?\b/i;

export function detectDosageMention(message: string): boolean {
  return DOSAGE_PATTERN.test(message);
}

export function buildDosageNotice(): string {
  return (
    "Just so you know, I don't currently factor dosage or frequency into a risk check — only which " +
    "medications, allergies, and conditions are involved."
  );
}
