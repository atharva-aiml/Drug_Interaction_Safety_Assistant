import { describe, expect, it } from "vitest";
import { AllergyLink, ContraindicationLink, DrugInteraction, RiskPath } from "@disa/shared-types";
import {
  assertGroundedInPath,
  buildAllergyPath,
  buildContraindicationPath,
  buildInteractionPath,
  ExplanationGroundingError,
  explainPath,
} from "./riskPath.js";

const WARFARIN = { id: "drug-1", name: "Warfarin" };
const IBUPROFEN = { id: "drug-2", name: "Ibuprofen" };
const PENICILLIN = { id: "allergen-1", name: "Penicillin" };
const CKD = { id: "disease-1", name: "Chronic Kidney Disease" };
const PATIENT = { id: "patient-1", displayName: "Jane Synthetic" };

describe("buildInteractionPath", () => {
  it("without a patient, produces just two Drug nodes and one INTERACTS_WITH edge", () => {
    const interaction: DrugInteraction = { id: "int-1", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" };
    const path = buildInteractionPath(interaction);
    expect(path.nodes).toHaveLength(2);
    expect(path.edges).toEqual([{ type: "INTERACTS_WITH", fromId: WARFARIN.id, toId: IBUPROFEN.id, severity: "severe" }]);
  });

  it("with a patient, adds the Patient node and a TAKES edge to each interacting drug", () => {
    const interaction: DrugInteraction = { id: "int-1", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" };
    const path = buildInteractionPath(interaction, PATIENT);
    expect(path.nodes).toHaveLength(3);
    expect(path.nodes.some((n) => n.label === "Patient" && n.id === PATIENT.id)).toBe(true);
    const takesEdges = path.edges.filter((e) => e.type === "TAKES");
    expect(takesEdges).toHaveLength(2);
    expect(takesEdges.map((e) => e.toId).sort()).toEqual([WARFARIN.id, IBUPROFEN.id].sort());
    expect(takesEdges.every((e) => e.fromId === PATIENT.id)).toBe(true);
  });
});

describe("buildAllergyPath", () => {
  it("without a patient, produces just the Drug and Allergen nodes", () => {
    const link: AllergyLink = { id: "al-1", drug: IBUPROFEN, allergen: PENICILLIN, severity: "moderate" };
    const path = buildAllergyPath(link);
    expect(path.nodes).toHaveLength(2);
    expect(path.edges).toHaveLength(1);
  });

  it("with a patient, adds the Patient node and HAS_ALLERGY edge", () => {
    const link: AllergyLink = { id: "al-1", drug: IBUPROFEN, allergen: PENICILLIN, severity: "moderate" };
    const path = buildAllergyPath(link, PATIENT);
    expect(path.nodes).toHaveLength(3);
    expect(path.edges).toHaveLength(2);
    expect(path.edges.some((e) => e.type === "HAS_ALLERGY")).toBe(true);
  });
});

describe("buildContraindicationPath", () => {
  it("with a patient, adds the Patient node and HAS_CONDITION edge", () => {
    const link: ContraindicationLink = { id: "ci-1", drug: IBUPROFEN, disease: CKD, severity: "contraindicated" };
    const path = buildContraindicationPath(link, PATIENT);
    expect(path.nodes).toHaveLength(3);
    expect(path.edges.some((e) => e.type === "HAS_CONDITION")).toBe(true);
  });
});

describe("explainPath", () => {
  it("generates an interaction sentence naming both drugs and the severity", () => {
    const path = buildInteractionPath({ id: "int-1", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" });
    const result = explainPath("interaction", path);
    expect(result.text).toBe("Warfarin and Ibuprofen have a severe interaction.");
    expect(result.referencedNodeIds.sort()).toEqual([WARFARIN.id, IBUPROFEN.id].sort());
  });

  it("generates an allergy sentence that names the patient when the path includes one", () => {
    const link: AllergyLink = { id: "al-1", drug: IBUPROFEN, allergen: PENICILLIN, severity: "moderate" };
    const path = buildAllergyPath(link, PATIENT);
    const result = explainPath("allergy", path);
    expect(result.text).toContain("Ibuprofen");
    expect(result.text).toContain("Penicillin");
    expect(result.text).toContain("Jane Synthetic");
    expect(result.referencedNodeIds).toContain(PATIENT.id);
  });

  it("generates a contraindication sentence without a patient when none is given", () => {
    const link: ContraindicationLink = { id: "ci-1", drug: IBUPROFEN, disease: CKD, severity: "contraindicated" };
    const path = buildContraindicationPath(link);
    const result = explainPath("contraindication", path);
    expect(result.text).toContain("Ibuprofen");
    expect(result.text).toContain("Chronic Kidney Disease");
    expect(result.referencedNodeIds).not.toContain(PATIENT.id);
  });
});

describe("assertGroundedInPath — the actual business rule enforcement", () => {
  it("does not throw for a real explainPath result against its own path", () => {
    const path = buildInteractionPath({ id: "int-1", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" });
    const result = explainPath("interaction", path);
    expect(() => assertGroundedInPath(result, path)).not.toThrow();
  });

  it("catches a hallucinated reference — an id not present in the path's own nodes", () => {
    const path = buildInteractionPath({ id: "int-1", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" });
    const fabricated = { text: "Warfarin and some other drug interact.", referencedNodeIds: [WARFARIN.id, "drug-not-in-path"] };
    expect(() => assertGroundedInPath(fabricated, path)).toThrow(ExplanationGroundingError);
  });

  it("reports exactly which id(s) were ungrounded", () => {
    const path: RiskPath = { nodes: [{ id: "drug-1", label: "Drug", name: "Warfarin" }], edges: [] };
    const fabricated = { text: "irrelevant", referencedNodeIds: ["drug-1", "phantom-id"] };
    try {
      assertGroundedInPath(fabricated, path);
      expect.fail("expected assertGroundedInPath to throw");
    } catch (err) {
      expect((err as ExplanationGroundingError).unknownNodeIds).toEqual(["phantom-id"]);
    }
  });
});
