import {
  AllergyLink,
  ContraindicationLink,
  DrugInteraction,
  PathEdge,
  PathNode,
  RiskPath,
  RiskType,
} from "@disa/shared-types";

interface PatientRef {
  id: string;
  displayName: string;
}

export function buildInteractionPath(interaction: DrugInteraction, patient?: PatientRef): RiskPath {
  const nodes: PathNode[] = [
    { id: interaction.drugA.id, label: "Drug", name: interaction.drugA.name },
    { id: interaction.drugB.id, label: "Drug", name: interaction.drugB.name },
  ];
  const edges: PathEdge[] = [
    { type: "INTERACTS_WITH", fromId: interaction.drugA.id, toId: interaction.drugB.id, severity: interaction.severity },
  ];
  if (patient) {
    nodes.push({ id: patient.id, label: "Patient", name: patient.displayName });
    edges.push({ type: "TAKES", fromId: patient.id, toId: interaction.drugA.id });
    edges.push({ type: "TAKES", fromId: patient.id, toId: interaction.drugB.id });
  }
  return { nodes, edges };
}

export function buildAllergyPath(link: AllergyLink, patient?: PatientRef): RiskPath {
  const nodes: PathNode[] = [
    { id: link.drug.id, label: "Drug", name: link.drug.name },
    { id: link.allergen.id, label: "Allergen", name: link.allergen.name },
  ];
  const edges: PathEdge[] = [
    { type: "CONTAINS_ALLERGEN", fromId: link.drug.id, toId: link.allergen.id, severity: link.severity },
  ];
  if (patient) {
    nodes.push({ id: patient.id, label: "Patient", name: patient.displayName });
    edges.push({ type: "HAS_ALLERGY", fromId: patient.id, toId: link.allergen.id });
  }
  return { nodes, edges };
}

export function buildContraindicationPath(link: ContraindicationLink, patient?: PatientRef): RiskPath {
  const nodes: PathNode[] = [
    { id: link.drug.id, label: "Drug", name: link.drug.name },
    { id: link.disease.id, label: "Disease", name: link.disease.name },
  ];
  const edges: PathEdge[] = [
    { type: "CONTRAINDICATED_FOR", fromId: link.drug.id, toId: link.disease.id, severity: link.severity },
  ];
  if (patient) {
    nodes.push({ id: patient.id, label: "Patient", name: patient.displayName });
    edges.push({ type: "HAS_CONDITION", fromId: patient.id, toId: link.disease.id });
  }
  return { nodes, edges };
}

export interface ExplanationResult {
  text: string;
  /** Every node id the generator actually looked a name up for — the grounding proof. */
  referencedNodeIds: string[];
}

/**
 * Pure text generation — REQ-011 / System Architecture SD-005. Every name in
 * the output comes through `name(id)`, which both looks up the node AND
 * records that id as referenced. `referencedNodeIds` is the generator's own
 * receipt of what it actually used, checked against the path by
 * assertGroundedInPath below — this is what makes "derived only from the
 * path" a provable property instead of a convention.
 */
export function explainPath(type: RiskType, path: RiskPath): ExplanationResult {
  const referenced = new Set<string>();
  const name = (id: string): string => {
    referenced.add(id);
    return path.nodes.find((n) => n.id === id)?.name ?? "(unknown)";
  };

  let text: string;

  if (type === "interaction") {
    const edge = path.edges.find((e) => e.type === "INTERACTS_WITH");
    text = edge
      ? `${name(edge.fromId)} and ${name(edge.toId)} have a ${edge.severity} interaction.`
      : "No interaction relationship found in the provided path.";
  } else if (type === "allergy") {
    const containsEdge = path.edges.find((e) => e.type === "CONTAINS_ALLERGEN");
    if (!containsEdge) {
      text = "No allergen relationship found in the provided path.";
    } else {
      const drugName = name(containsEdge.fromId);
      const allergenName = name(containsEdge.toId);
      const hasAllergyEdge = path.edges.find((e) => e.type === "HAS_ALLERGY");
      text = hasAllergyEdge
        ? `${drugName} contains ${allergenName}. ${name(hasAllergyEdge.fromId)} has a recorded allergy to ${allergenName} — a ${containsEdge.severity} allergy risk.`
        : `${drugName} contains ${allergenName}, a known allergen — a ${containsEdge.severity} allergy risk if the patient is allergic to it.`;
    }
  } else {
    const contraindicatedEdge = path.edges.find((e) => e.type === "CONTRAINDICATED_FOR");
    if (!contraindicatedEdge) {
      text = "No contraindication relationship found in the provided path.";
    } else {
      const drugName = name(contraindicatedEdge.fromId);
      const diseaseName = name(contraindicatedEdge.toId);
      const hasConditionEdge = path.edges.find((e) => e.type === "HAS_CONDITION");
      text = hasConditionEdge
        ? `${drugName} is contraindicated for ${diseaseName}, at ${contraindicatedEdge.severity} severity. ${name(hasConditionEdge.fromId)} has a recorded diagnosis of ${diseaseName}.`
        : `${drugName} is contraindicated for ${diseaseName}, at ${contraindicatedEdge.severity} severity, if the patient has this condition.`;
    }
  }

  return { text, referencedNodeIds: [...referenced] };
}

export class ExplanationGroundingError extends Error {
  constructor(public unknownNodeIds: string[]) {
    super(`Explanation references node id(s) not present in the path: ${unknownNodeIds.join(", ")}`);
  }
}

/**
 * Business rule (Requirements §3): "no explanation may state a relationship
 * the graph did not return." Enforced by checking the generator's own
 * referenced-id receipt against the path's actual node set — not by
 * re-parsing the generated prose, which would be fragile and easy to fool.
 */
export function assertGroundedInPath(result: ExplanationResult, path: RiskPath): void {
  const pathNodeIds = new Set(path.nodes.map((n) => n.id));
  const unknown = result.referencedNodeIds.filter((id) => !pathNodeIds.has(id));
  if (unknown.length > 0) {
    throw new ExplanationGroundingError(unknown);
  }
}
