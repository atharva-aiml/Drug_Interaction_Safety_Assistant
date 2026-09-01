import { ContraindicationLink, Risk, SEVERITIES, Severity } from "@disa/shared-types";

export class ContraindicationValidationError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

/**
 * Business rule, applied consistently with INTERACTS_WITH (Requirements §3):
 * a CONTRAINDICATED_FOR edge cannot exist without a severity — a
 * contraindication can be relative (use with caution) or absolute. Pure.
 */
export function assertValidSeverity(severity: unknown): asserts severity is Severity {
  if (typeof severity !== "string" || !SEVERITIES.includes(severity as Severity)) {
    throw new ContraindicationValidationError(
      "SEVERITY_REQUIRED",
      `severity is required and must be one of: ${SEVERITIES.join(", ")}`
    );
  }
}

export function toRisk(link: ContraindicationLink): Risk {
  return {
    id: link.id,
    type: "contraindication",
    severity: link.severity,
    drugsInvolved: [link.drug],
    summary: `${link.drug.name} is contraindicated for this patient's ${link.disease.name}.`,
    cypher: {
      label: "Drug\u2013condition contraindication",
      query: `MATCH (d:Drug {name: '${link.drug.name}'})-[r:CONTRAINDICATED_FOR]->(dis:Disease {name: '${link.disease.name}'})\nRETURN d, dis, r`,
    },
  };
}
