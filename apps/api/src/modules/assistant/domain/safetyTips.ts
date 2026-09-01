import { RiskType, Severity } from "@disa/shared-types";

/**
 * Deterministic, severity/type-keyed precaution templates (REQ-029) — never
 * LLM-invented. Kept generic on purpose: no specific clinical claim beyond
 * what the graph already returned, per REQ-022 ("will not perform actual
 * clinical diagnosis"). The LLM (composeAnswer) may rephrase these, never
 * originate them.
 */
const SEVERITY_TIPS: Record<Severity, string> = {
  minor: "This is generally low-risk, but mention it at your next appointment so it's on record.",
  moderate: "Keep an eye out for new or worsening symptoms, and consider checking with a pharmacist or doctor before continuing.",
  severe: "Contact a healthcare professional promptly before continuing this combination.",
  contraindicated: "This combination is generally not recommended — seek medical advice as soon as possible rather than continuing on your own.",
};

const TYPE_TIPS: Record<RiskType, string> = {
  interaction: "Don't stop or change a medication on your own without medical guidance.",
  allergy: "If you notice signs of an allergic reaction (rash, swelling, difficulty breathing), seek care immediately.",
  contraindication: "Make sure whoever manages your prescriptions is aware of this condition.",
};

export function getPrecautions(type: RiskType, severity: Severity): string[] {
  return [SEVERITY_TIPS[severity], TYPE_TIPS[type]];
}
