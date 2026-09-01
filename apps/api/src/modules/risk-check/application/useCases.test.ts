import { describe, expect, it } from "vitest";
import { AllergyLink, ContraindicationLink, DrugInteraction } from "@disa/shared-types";
import { AllergyLinkRepository } from "../../allergy-links/application/ports.js";
import { ContraindicationRepository } from "../../contraindications/application/ports.js";
import { InteractionRepository } from "../../interactions/application/ports.js";
import { PatientNotFoundError, PatientProfile, PatientProfileLookupPort } from "./ports.js";
import { checkIncrementalRisks, checkRisks } from "./useCases.js";

const WARFARIN = { id: "drug-1", name: "Warfarin" };
const IBUPROFEN = { id: "drug-2", name: "Ibuprofen" };
const PENICILLIN = { id: "allergen-1", name: "Penicillin" };
const CKD = { id: "disease-1", name: "Chronic Kidney Disease" };

class FakeInteractionRepository implements InteractionRepository {
  constructor(private interactions: DrugInteraction[] = []) {}
  async create(): Promise<DrugInteraction> {
    throw new Error("not used in this test");
  }
  async findAmong(drugIds: string[]): Promise<DrugInteraction[]> {
    const idSet = new Set(drugIds);
    return this.interactions.filter((i) => idSet.has(i.drugA.id) && idSet.has(i.drugB.id));
  }
  async findById(id: string): Promise<DrugInteraction | undefined> {
    return this.interactions.find((i) => i.id === id);
  }
  async findInvolving(drugId: string, otherDrugIds: string[]): Promise<DrugInteraction[]> {
    const otherSet = new Set(otherDrugIds);
    return this.interactions.filter((i) => {
      if (i.drugA.id === drugId) return otherSet.has(i.drugB.id);
      if (i.drugB.id === drugId) return otherSet.has(i.drugA.id);
      return false;
    });
  }
}

class FakeAllergyLinkRepository implements AllergyLinkRepository {
  constructor(private links: AllergyLink[] = []) {}
  async create(): Promise<AllergyLink> {
    throw new Error("not used in this test");
  }
  async findConflicts(drugIds: string[], allergenIds: string[]): Promise<AllergyLink[]> {
    const drugSet = new Set(drugIds);
    const allergenSet = new Set(allergenIds);
    return this.links.filter((l) => drugSet.has(l.drug.id) && allergenSet.has(l.allergen.id));
  }
  async findById(id: string): Promise<AllergyLink | undefined> {
    return this.links.find((l) => l.id === id);
  }
}

class FakeContraindicationRepository implements ContraindicationRepository {
  constructor(private links: ContraindicationLink[] = []) {}
  async create(): Promise<ContraindicationLink> {
    throw new Error("not used in this test");
  }
  async findConflicts(drugIds: string[], diseaseIds: string[]): Promise<ContraindicationLink[]> {
    const drugSet = new Set(drugIds);
    const diseaseSet = new Set(diseaseIds);
    return this.links.filter((l) => drugSet.has(l.drug.id) && diseaseSet.has(l.disease.id));
  }
  async findById(id: string): Promise<ContraindicationLink | undefined> {
    return this.links.find((l) => l.id === id);
  }
}

class FakePatientProfileLookup implements PatientProfileLookupPort {
  constructor(private byPatient = new Map<string, PatientProfile>()) {}
  async getProfile(patientId: string): Promise<PatientProfile | undefined> {
    return this.byPatient.get(patientId);
  }
}

describe("checkRisks use case", () => {
  it("combines all three risk types for a direct medications/allergies/conditions request", async () => {
    const interactions = new FakeInteractionRepository([
      { id: "int-1", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" },
    ]);
    const allergyLinks = new FakeAllergyLinkRepository([
      { id: "al-1", drug: IBUPROFEN, allergen: PENICILLIN, severity: "moderate" },
    ]);
    const contraindications = new FakeContraindicationRepository([
      { id: "ci-1", drug: IBUPROFEN, disease: CKD, severity: "contraindicated" },
    ]);
    const patientProfile = new FakePatientProfileLookup();

    const risks = await checkRisks(
      {
        medications: [WARFARIN.id, IBUPROFEN.id],
        allergies: [PENICILLIN.id],
        conditions: [CKD.id],
      },
      { interactions, allergyLinks, contraindications, patientProfile }
    );

    expect(risks).toHaveLength(3);
    expect(risks.map((r) => r.type).sort()).toEqual(["allergy", "contraindication", "interaction"]);
  });

  it("resolves the full profile from patientId, matching the Build Plan's exact scenario", async () => {
    const interactions = new FakeInteractionRepository([
      { id: "int-1", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" },
    ]);
    const allergyLinks = new FakeAllergyLinkRepository([
      { id: "al-1", drug: IBUPROFEN, allergen: PENICILLIN, severity: "moderate" },
    ]);
    const contraindications = new FakeContraindicationRepository([
      { id: "ci-1", drug: IBUPROFEN, disease: CKD, severity: "contraindicated" },
    ]);
    const patientProfile = new FakePatientProfileLookup(
      new Map([
        [
          "patient-1",
          { medicationIds: [WARFARIN.id, IBUPROFEN.id], allergyIds: [PENICILLIN.id], conditionIds: [CKD.id] },
        ],
      ])
    );

    const risks = await checkRisks({ patientId: "patient-1" }, { interactions, allergyLinks, contraindications, patientProfile });

    expect(risks).toHaveLength(3);
  });

  it("returns only the risk types that actually match — no false positives from unrelated data", async () => {
    const interactions = new FakeInteractionRepository([
      { id: "int-1", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" },
    ]);
    const allergyLinks = new FakeAllergyLinkRepository([]);
    const contraindications = new FakeContraindicationRepository([]);
    const patientProfile = new FakePatientProfileLookup();

    const risks = await checkRisks(
      { medications: [WARFARIN.id, IBUPROFEN.id], allergies: ["allergen-unrelated"], conditions: [] },
      { interactions, allergyLinks, contraindications, patientProfile }
    );

    expect(risks).toHaveLength(1);
    expect(risks[0].type).toBe("interaction");
  });

  it("throws PatientNotFoundError for an unknown patientId", async () => {
    const interactions = new FakeInteractionRepository();
    const allergyLinks = new FakeAllergyLinkRepository();
    const contraindications = new FakeContraindicationRepository();
    const patientProfile = new FakePatientProfileLookup();

    await expect(
      checkRisks({ patientId: "missing" }, { interactions, allergyLinks, contraindications, patientProfile })
    ).rejects.toBeInstanceOf(PatientNotFoundError);
  });

  it("returns an empty list for a patient with no medications at all", async () => {
    const interactions = new FakeInteractionRepository();
    const allergyLinks = new FakeAllergyLinkRepository();
    const contraindications = new FakeContraindicationRepository();
    const patientProfile = new FakePatientProfileLookup();

    const risks = await checkRisks(
      { medications: [], allergies: [], conditions: [] },
      { interactions, allergyLinks, contraindications, patientProfile }
    );
    expect(risks).toEqual([]);
  });
});

describe("checkIncrementalRisks use case (REQ-016)", () => {
  it("finds a new interaction risk between the added drug and an existing medication", async () => {
    const interactions = new FakeInteractionRepository([
      { id: "int-1", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" },
    ]);
    const allergyLinks = new FakeAllergyLinkRepository();
    const contraindications = new FakeContraindicationRepository();
    const patientProfile = new FakePatientProfileLookup(
      new Map([["patient-1", { medicationIds: [WARFARIN.id, IBUPROFEN.id], allergyIds: [], conditionIds: [] }]])
    );

    const risks = await checkIncrementalRisks("patient-1", IBUPROFEN.id, {
      interactions,
      allergyLinks,
      contraindications,
      patientProfile,
    });

    expect(risks).toHaveLength(1);
    expect(risks[0].type).toBe("interaction");
  });

  it("does not recompute risks among medications the patient was already taking — the actual point of this feature", async () => {
    const interactions = new FakeInteractionRepository([
      { id: "int-existing", drugA: WARFARIN, drugB: IBUPROFEN, severity: "severe" },
    ]);
    const allergyLinks = new FakeAllergyLinkRepository();
    const contraindications = new FakeContraindicationRepository();
    // Patient already had Warfarin + Ibuprofen (and the risk between them); a third drug is added.
    const patientProfile = new FakePatientProfileLookup(
      new Map([
        ["patient-1", { medicationIds: [WARFARIN.id, IBUPROFEN.id, "drug-3"], allergyIds: [], conditionIds: [] }],
      ])
    );

    const risks = await checkIncrementalRisks("patient-1", "drug-3", {
      interactions,
      allergyLinks,
      contraindications,
      patientProfile,
    });

    // The pre-existing Warfarin/Ibuprofen risk must NOT reappear in an incremental result.
    expect(risks).toEqual([]);
  });

  it("finds a new allergy risk introduced by the added drug against the patient's existing allergies", async () => {
    const interactions = new FakeInteractionRepository();
    const allergyLinks = new FakeAllergyLinkRepository([
      { id: "al-1", drug: IBUPROFEN, allergen: PENICILLIN, severity: "moderate" },
    ]);
    const contraindications = new FakeContraindicationRepository();
    const patientProfile = new FakePatientProfileLookup(
      new Map([["patient-1", { medicationIds: [IBUPROFEN.id], allergyIds: [PENICILLIN.id], conditionIds: [] }]])
    );

    const risks = await checkIncrementalRisks("patient-1", IBUPROFEN.id, {
      interactions,
      allergyLinks,
      contraindications,
      patientProfile,
    });

    expect(risks).toHaveLength(1);
    expect(risks[0].type).toBe("allergy");
  });

  it("throws PatientNotFoundError for an unknown patientId", async () => {
    const interactions = new FakeInteractionRepository();
    const allergyLinks = new FakeAllergyLinkRepository();
    const contraindications = new FakeContraindicationRepository();
    const patientProfile = new FakePatientProfileLookup();

    await expect(
      checkIncrementalRisks("missing", IBUPROFEN.id, { interactions, allergyLinks, contraindications, patientProfile })
    ).rejects.toBeInstanceOf(PatientNotFoundError);
  });
});
