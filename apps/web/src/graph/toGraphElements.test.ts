import { describe, expect, it } from "vitest";
import type { RiskPath } from "@disa/shared-types";
import { assertNodesHaveTypeLabel, MissingTypeLabelError, toGraphElements } from "./toGraphElements";

const INTERACTION_PATH: RiskPath = {
  nodes: [
    { id: "drug-1", label: "Drug", name: "Warfarin" },
    { id: "drug-2", label: "Drug", name: "Ibuprofen" },
  ],
  edges: [{ type: "INTERACTS_WITH", fromId: "drug-1", toId: "drug-2", severity: "severe" }],
};

const ALLERGY_PATH_WITH_PATIENT: RiskPath = {
  nodes: [
    { id: "drug-1", label: "Drug", name: "Ibuprofen" },
    { id: "allergen-1", label: "Allergen", name: "Penicillin" },
    { id: "patient-1", label: "Patient", name: "Jane Synthetic" },
  ],
  edges: [
    { type: "CONTAINS_ALLERGEN", fromId: "drug-1", toId: "allergen-1", severity: "moderate" },
    { type: "HAS_ALLERGY", fromId: "patient-1", toId: "allergen-1" },
  ],
};

describe("toGraphElements", () => {
  it("maps every path node to a graph node with a color token and type label", () => {
    const elements = toGraphElements(INTERACTION_PATH);
    expect(elements.nodes).toHaveLength(2);
    expect(elements.nodes[0].data).toEqual({
      id: "drug-1",
      typeLabel: "Drug",
      displayLabel: "Warfarin",
      colorToken: "#2563EB",
    });
  });

  it("uses a distinct color per node type", () => {
    const elements = toGraphElements(ALLERGY_PATH_WITH_PATIENT);
    const colors = new Set(elements.nodes.map((n) => n.data.colorToken));
    expect(colors.size).toBe(3);
  });

  it("maps every path edge to a graph edge carrying its type (and severity when present)", () => {
    const elements = toGraphElements(ALLERGY_PATH_WITH_PATIENT);
    expect(elements.edges).toHaveLength(2);
    expect(elements.edges.find((e) => e.data.source === "drug-1")?.data.edgeLabel).toBe("CONTAINS_ALLERGEN (moderate)");
    expect(elements.edges.find((e) => e.data.source === "patient-1")?.data.edgeLabel).toBe("HAS_ALLERGY");
  });

  it("produces exactly as many graph nodes/edges as the source path — no invented elements", () => {
    const elements = toGraphElements(ALLERGY_PATH_WITH_PATIENT);
    expect(elements.nodes).toHaveLength(ALLERGY_PATH_WITH_PATIENT.nodes.length);
    expect(elements.edges).toHaveLength(ALLERGY_PATH_WITH_PATIENT.edges.length);
  });
});

describe("assertNodesHaveTypeLabel — the actual business rule enforcement", () => {
  it("does not throw for real toGraphElements output", () => {
    const elements = toGraphElements(INTERACTION_PATH);
    expect(() => assertNodesHaveTypeLabel(elements)).not.toThrow();
  });

  it("catches a node rendered with color but no type label — the regression this rule exists to prevent", () => {
    const elements = toGraphElements(INTERACTION_PATH);
    // Simulate a future edit that strips the label to "save space" in the UI.
    elements.nodes[0].data.typeLabel = "" as never;
    expect(() => assertNodesHaveTypeLabel(elements)).toThrow(MissingTypeLabelError);
  });
});
