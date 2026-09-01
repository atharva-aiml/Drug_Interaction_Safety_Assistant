import { AllergyLink, Risk, SEVERITIES, Severity } from "@disa/shared-types";

export class AllergyLinkValidationError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

/**
 * Business rule (extended from Requirements §3's severity rule for
 * INTERACTS_WITH, applied consistently here — see System Architecture §3):
 * a CONTAINS_ALLERGEN edge cannot exist without a severity, since an allergy
 * conflict can range from a mild rash to anaphylaxis. Pure — no I/O.
 */
export function assertValidSeverity(severity: unknown): asserts severity is Severity {
  if (typeof severity !== "string" || !SEVERITIES.includes(severity as Severity)) {
    throw new AllergyLinkValidationError(
      "SEVERITY_REQUIRED",
      `severity is required and must be one of: ${SEVERITIES.join(", ")}`
    );
  }
}

/** Pure formatting — every word comes from the link itself (REQ-011-adjacent). */
export function toRisk(link: AllergyLink): Risk {
  return {
    id: link.id,
    type: "allergy",
    severity: link.severity,
    drugsInvolved: [link.drug],
    summary: `${link.drug.name} contains ${link.allergen.name}, which this patient is allergic to.`,
    cypher: {
      label: "Drug\u2013allergen conflict",
      query: `MATCH (d:Drug {name: '${link.drug.name}'})-[r:CONTAINS_ALLERGEN]->(a:Allergen {name: '${link.allergen.name}'})\nRETURN d, a, r`,
    },
  };
}
