function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export interface KnownEntities {
  hasMedications: boolean;
  hasAllergies: boolean;
  hasConditions: boolean;
}

/**
 * Asked at the start of a session (and, if the reply didn't cover
 * everything, up to once more — see `runTurn`'s retry cap) — gathers
 * whichever of medications/allergies/conditions aren't yet answered before
 * any conclusion is drawn, per the user's explicit request: a category is
 * "answered" once it has a known entry OR the user has explicitly said
 * there is none, never just from silence. Deterministic, not LLM-composed:
 * a safety-relevant intake question shouldn't vary.
 */
export function buildIntakeQuestion(known: KnownEntities, symptoms: string[], isFollowUp = false): string {
  const missing: string[] = [];
  if (!known.hasMedications) missing.push("any medications you're currently taking");
  if (!known.hasAllergies) missing.push("known allergies");
  if (!known.hasConditions) missing.push("diagnosed conditions");

  if (isFollowUp) {
    return missing.length === 0
      ? "Just to make sure I have the full picture before checking — is there anything else I should know?"
      : `Just to make sure I have the full picture before checking, could you also tell me about ${joinWithAnd(missing)}? Let me know if there are none.`;
  }

  const intro = symptoms.length > 0 ? `I'm sorry to hear you're dealing with ${joinWithAnd(symptoms)}. ` : "";
  if (missing.length === 0) {
    return `${intro}Before I check for any risks, is there anything else I should know?`;
  }
  return `${intro}Before I check for any risks, could you tell me about ${joinWithAnd(missing)}? Let me know if there are none.`;
}

/**
 * The terminal response once intake is complete but nothing was ever found
 * to check (no medications, allergies, or conditions on record) and a
 * symptom was reported — generic, non-diagnostic guidance (REQ-022), never
 * a specific claim about the cause. The deterministic ground truth
 * `composeAnswer` would rephrase; it never originates the advice itself.
 */
export function buildGenericSymptomTemplate(symptoms: string[]): string {
  return (
    `Since there's no medication, allergy, or condition on record for you, ${joinWithAnd(symptoms)} isn't something ` +
    `I can check against a drug interaction here. In general: keep an eye on how you feel, rest and stay hydrated as ` +
    `appropriate, and see a healthcare professional if it persists, worsens, or feels severe. This assistant can't ` +
    `diagnose conditions — for anything concerning, please consult a doctor.`
  );
}
