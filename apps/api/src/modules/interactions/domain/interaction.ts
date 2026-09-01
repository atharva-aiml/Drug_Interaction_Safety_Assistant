import { DrugInteraction, Risk, SEVERITIES, Severity } from "@disa/shared-types";

export class InteractionValidationError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

/**
 * Business rule (Requirements §3 / System Architecture §3): an INTERACTS_WITH
 * edge cannot exist without a severity level. Pure — no I/O.
 */
export function assertValidSeverity(severity: unknown): asserts severity is Severity {
  if (typeof severity !== "string" || !SEVERITIES.includes(severity as Severity)) {
    throw new InteractionValidationError(
      "SEVERITY_REQUIRED",
      `severity is required and must be one of: ${SEVERITIES.join(", ")}`
    );
  }
}

export function assertDistinctDrugs(drugAId: string, drugBId: string): void {
  if (drugAId === drugBId) {
    throw new InteractionValidationError("SAME_DRUG", "A drug cannot interact with itself.");
  }
}

/**
 * INTERACTS_WITH is modeled as symmetric (System Architecture §3), but the
 * same underlying pair can arrive as both A→B and B→A depending on how it
 * was queried/seeded. Pure de-duplication so a risk list never shows the
 * same pair twice.
 */
export function dedupeSymmetricPairs(interactions: DrugInteraction[]): DrugInteraction[] {
  const seen = new Set<string>();
  const result: DrugInteraction[] = [];
  for (const interaction of interactions) {
    const key = [interaction.drugA.id, interaction.drugB.id].sort().join("::");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(interaction);
  }
  return result;
}

export class IncrementalScopeError extends Error {
  constructor(public offendingInteractionIds: string[], public expectedDrugId: string) {
    super(
      `Incremental recheck must only return interactions involving drug ${expectedDrugId}, but got: ${offendingInteractionIds.join(", ")}`
    );
  }
}

/**
 * Business rule (Requirements §3 / REQ-016): an incremental recheck must
 * only traverse paths that touch the newly added drug — never recompute
 * pairs among drugs the patient was already taking. Pure guard, not just a
 * hope about the query shape: if a future edit accidentally widens the
 * repository query back into a full scan, this catches it instead of
 * silently duplicating already-shown risks.
 */
export function assertOnlyInvolvesDrug(interactions: DrugInteraction[], drugId: string): void {
  const offending = interactions.filter((i) => i.drugA.id !== drugId && i.drugB.id !== drugId).map((i) => i.id);
  if (offending.length > 0) {
    throw new IncrementalScopeError(offending, drugId);
  }
}

/**
 * Pure formatting: turns a raw interaction edge into the Risk shape SCR-002
 * renders (REQ-011-adjacent — every word here comes from the interaction
 * object itself, nothing is invented).
 */
export function toRisk(interaction: DrugInteraction): Risk {
  return {
    id: interaction.id,
    type: "interaction",
    severity: interaction.severity,
    drugsInvolved: [interaction.drugA, interaction.drugB],
    summary: `${interaction.drugA.name} and ${interaction.drugB.name} have a ${interaction.severity} interaction.`,
    cypher: {
      label: "Drug\u2013drug interaction",
      query: `MATCH (a:Drug {name: '${interaction.drugA.name}'})-[r:INTERACTS_WITH]-(b:Drug {name: '${interaction.drugB.name}'})\nRETURN a, b, r`,
    },
  };
}
