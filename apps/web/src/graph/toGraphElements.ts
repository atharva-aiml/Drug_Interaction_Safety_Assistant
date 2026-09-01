import type { PathNodeLabel, RiskPath } from "@disa/shared-types";

export interface GraphNodeData {
  id: string;
  /** Always shown alongside colorToken — see assertNodesHaveTypeLabel below. */
  typeLabel: PathNodeLabel;
  displayLabel: string;
  colorToken: string;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  edgeLabel: string;
}

export interface GraphElements {
  nodes: { data: GraphNodeData }[];
  edges: { data: GraphEdgeData }[];
}

const NODE_COLOR_BY_LABEL: Record<PathNodeLabel, string> = {
  Drug: "#2563EB",
  Patient: "#7C3AED",
  Allergen: "#CA8A04",
  Disease: "#DB2777",
};

/**
 * Pure mapping from a RiskPath (already real data from GET /risks/:id) into
 * Cytoscape-ready element definitions. No I/O.
 */
export function toGraphElements(path: RiskPath): GraphElements {
  const nodes = path.nodes.map((node) => ({
    data: {
      id: node.id,
      typeLabel: node.label,
      displayLabel: node.name,
      colorToken: NODE_COLOR_BY_LABEL[node.label],
    },
  }));

  const edges = path.edges.map((edge, index) => ({
    data: {
      id: `${edge.fromId}-${edge.type}-${edge.toId}-${index}`,
      source: edge.fromId,
      target: edge.toId,
      edgeLabel: edge.severity ? `${edge.type} (${edge.severity})` : edge.type,
    },
  }));

  return { nodes, edges };
}

export class MissingTypeLabelError extends Error {
  constructor(public nodeIds: string[]) {
    super(`Node(s) rendered without a type label — color alone is never sufficient: ${nodeIds.join(", ")}`);
  }
}

/**
 * Business rule (Design System §1 / WCAG 1.4.1, restated in Build Plan V0.6):
 * "each node also carries a type label — never color-only." Enforced here
 * rather than left to convention, so a future edit that strips the label
 * (e.g., to save space) fails loudly instead of silently.
 */
export function assertNodesHaveTypeLabel(elements: GraphElements): void {
  const missing = elements.nodes.filter((n) => !n.data.typeLabel || !n.data.typeLabel.trim()).map((n) => n.data.id);
  if (missing.length > 0) {
    throw new MissingTypeLabelError(missing);
  }
}
