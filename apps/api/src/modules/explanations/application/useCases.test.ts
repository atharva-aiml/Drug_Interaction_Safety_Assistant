import { describe, expect, it } from "vitest";
import { AllergyLink, ContraindicationLink, DrugInteraction } from "@disa/shared-types";
import {
  AllergyLinkLookupPort,
  ContraindicationLookupPort,
  InteractionLookupPort,
  PatientLookupPort,
  PatientRef,
  RiskNotFoundError,
} from "./ports.js";
import { getRiskDetail } from "./useCases.js";

const WARFARIN = { id: "drug-1", name: "Warfarin" };
const IBUPROFEN = { id: "drug-2", name: "Ibuprofen" };
const PENICILLIN = { id: "allergen-1", name: "Penicillin" };
const CKD = { id: "disease-1", name: "Chronic Kidney Disease" };
const PATIENT: PatientRef = { id: "patient-1", displayName: "Jane Synthetic" };

class FakeInteractionLookup implements InteractionLookupPort {
  constructor(private interactions: DrugInteraction[] = []) {}
  async findById(id: string): Promise<DrugInteraction | undefined> {
    return this.interactions.find((i) => i.id === id);
  }
}

class FakeAllergyLinkLookup implements AllergyLinkLookupPort {
  constructor(private links: AllergyLink[] = []) {}
  async findById(id: string): Promise<AllergyLink | undefined> {
    return this.links.find((l) => l.id === id);
  }
}

class FakeContraindicationLookup implements ContraindicationLookupPort {
  constructor(private links: ContraindicationLink[] = []) {}
  async findById(id: string): Promise<ContraindicationLink | undefined> {
    return this.links.find((l) => l.id === id);
  }
}

class FakePatientLookup implements PatientLookupPort {
  constructor(private patients: PatientRef[] = []) {}
  async findById(id: string): Promise<PatientRef | undefined> {
    return this.patients.find((p) => p.id === id);
  }
}

describe("getRiskDetail use case", () => {
  it("finds an interaction risk and returns a grounded explanation + path", async () => {
    const interactions = new FakeInteractionLookup([{ id: "int-1", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" }]);
    const allergyLinks = new FakeAllergyLinkLookup();
    const contraindications = new FakeContraindicationLookup();
    const patients = new FakePatientLookup();

    const detail = await getRiskDetail("int-1", undefined, { interactions, allergyLinks, contraindications, patients });

    expect(detail.type).toBe("interaction");
    expect(detail.explanation).toBe("Warfarin and Ibuprofen have a severe interaction.");
    expect(detail.path.nodes).toHaveLength(2);
    expect(detail.path.edges).toHaveLength(1);
  });

  it("finds an interaction risk and includes the patient + TAKES edges when patientId is given", async () => {
    const interactions = new FakeInteractionLookup([{ id: "int-1", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" }]);
    const allergyLinks = new FakeAllergyLinkLookup();
    const contraindications = new FakeContraindicationLookup();
    const patients = new FakePatientLookup([PATIENT]);

    const detail = await getRiskDetail("int-1", "patient-1", { interactions, allergyLinks, contraindications, patients });

    expect(detail.path.nodes).toHaveLength(3);
    expect(detail.path.nodes.some((n) => n.label === "Patient")).toBe(true);
    expect(detail.path.edges.filter((e) => e.type === "TAKES")).toHaveLength(2);
  });

  it("finds an allergy risk and includes the patient in the path when patientId is given", async () => {
    const interactions = new FakeInteractionLookup();
    const allergyLinks = new FakeAllergyLinkLookup([{ id: "al-1", drug: IBUPROFEN, allergen: PENICILLIN, severity: "moderate" }]);
    const contraindications = new FakeContraindicationLookup();
    const patients = new FakePatientLookup([PATIENT]);

    const detail = await getRiskDetail("al-1", "patient-1", { interactions, allergyLinks, contraindications, patients });

    expect(detail.type).toBe("allergy");
    expect(detail.explanation).toContain("Jane Synthetic");
    expect(detail.path.nodes.some((n) => n.label === "Patient")).toBe(true);
  });

  it("finds an allergy risk without a patient node when patientId is omitted", async () => {
    const interactions = new FakeInteractionLookup();
    const allergyLinks = new FakeAllergyLinkLookup([{ id: "al-1", drug: IBUPROFEN, allergen: PENICILLIN, severity: "moderate" }]);
    const contraindications = new FakeContraindicationLookup();
    const patients = new FakePatientLookup([PATIENT]);

    const detail = await getRiskDetail("al-1", undefined, { interactions, allergyLinks, contraindications, patients });

    expect(detail.path.nodes.some((n) => n.label === "Patient")).toBe(false);
  });

  it("finds a contraindication risk when neither interaction nor allergy lookups match", async () => {
    const interactions = new FakeInteractionLookup();
    const allergyLinks = new FakeAllergyLinkLookup();
    const contraindications = new FakeContraindicationLookup([{ id: "ci-1", drug: IBUPROFEN, disease: CKD, severity: "contraindicated" }]);
    const patients = new FakePatientLookup([PATIENT]);

    const detail = await getRiskDetail("ci-1", "patient-1", { interactions, allergyLinks, contraindications, patients });

    expect(detail.type).toBe("contraindication");
    expect(detail.explanation).toContain("Chronic Kidney Disease");
  });

  it("throws RiskNotFoundError when no module recognizes the id", async () => {
    const interactions = new FakeInteractionLookup();
    const allergyLinks = new FakeAllergyLinkLookup();
    const contraindications = new FakeContraindicationLookup();
    const patients = new FakePatientLookup();

    await expect(
      getRiskDetail("missing-id", undefined, { interactions, allergyLinks, contraindications, patients })
    ).rejects.toBeInstanceOf(RiskNotFoundError);
  });
});
