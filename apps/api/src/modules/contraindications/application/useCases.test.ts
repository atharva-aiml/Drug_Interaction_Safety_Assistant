import { beforeEach, describe, expect, it } from "vitest";
import { ContraindicationLink, Severity } from "@disa/shared-types";
import { ContraindicationValidationError } from "../domain/contraindicationLink.js";
import {
  ContraindicationRepository,
  DiseaseCatalogPort,
  DiseaseNotFoundError,
  DrugCatalogPort,
  DrugNotFoundError,
} from "./ports.js";
import { createContraindication, findContraindicationRisks } from "./useCases.js";

const IBUPROFEN = { id: "drug-1", name: "Ibuprofen" };
const CKD = { id: "disease-1", name: "Chronic Kidney Disease" };

class InMemoryContraindicationRepository implements ContraindicationRepository {
  private links: ContraindicationLink[] = [];
  createCalls: { drugId: string; diseaseId: string; severity: Severity }[] = [];

  async create(id: string, drugId: string, diseaseId: string, severity: Severity): Promise<ContraindicationLink> {
    this.createCalls.push({ drugId, diseaseId, severity });
    const link: ContraindicationLink = { id, drug: IBUPROFEN, disease: CKD, severity };
    this.links.push(link);
    return link;
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

class FakeDrugCatalog implements DrugCatalogPort {
  constructor(private drugs = new Set<string>()) {}
  async existingDrugIds(ids: string[]): Promise<Set<string>> {
    return new Set(ids.filter((id) => this.drugs.has(id)));
  }
}

class FakeDiseaseCatalog implements DiseaseCatalogPort {
  constructor(private diseases = new Set<string>()) {}
  async existingDiseaseIds(ids: string[]): Promise<Set<string>> {
    return new Set(ids.filter((id) => this.diseases.has(id)));
  }
}

describe("createContraindication use case", () => {
  let contraindications: InMemoryContraindicationRepository;
  let drugCatalog: FakeDrugCatalog;
  let diseaseCatalog: FakeDiseaseCatalog;

  beforeEach(() => {
    contraindications = new InMemoryContraindicationRepository();
    drugCatalog = new FakeDrugCatalog(new Set([IBUPROFEN.id]));
    diseaseCatalog = new FakeDiseaseCatalog(new Set([CKD.id]));
  });

  it("creates a link when severity is valid and both nodes exist", async () => {
    const result = await createContraindication(IBUPROFEN.id, CKD.id, "severe", {
      contraindications,
      drugCatalog,
      diseaseCatalog,
      newId: () => "link-1",
    });
    expect(result.id).toBe("link-1");
    expect(contraindications.createCalls).toHaveLength(1);
  });

  it("rejects and never calls the repository when severity is missing", async () => {
    await expect(
      createContraindication(IBUPROFEN.id, CKD.id, undefined, { contraindications, drugCatalog, diseaseCatalog, newId: () => "link-1" })
    ).rejects.toBeInstanceOf(ContraindicationValidationError);
    expect(contraindications.createCalls).toHaveLength(0);
  });

  it("rejects when the drug doesn't exist", async () => {
    await expect(
      createContraindication("drug-999", CKD.id, "severe", { contraindications, drugCatalog, diseaseCatalog, newId: () => "link-1" })
    ).rejects.toBeInstanceOf(DrugNotFoundError);
  });

  it("rejects when the disease doesn't exist", async () => {
    await expect(
      createContraindication(IBUPROFEN.id, "disease-999", "severe", { contraindications, drugCatalog, diseaseCatalog, newId: () => "link-1" })
    ).rejects.toBeInstanceOf(DiseaseNotFoundError);
  });
});

describe("findContraindicationRisks use case", () => {
  it("returns a risk when a medication is contraindicated for a patient's condition", async () => {
    const contraindications = new InMemoryContraindicationRepository();
    const drugCatalog = new FakeDrugCatalog(new Set([IBUPROFEN.id]));
    const diseaseCatalog = new FakeDiseaseCatalog(new Set([CKD.id]));
    await createContraindication(IBUPROFEN.id, CKD.id, "severe", {
      contraindications,
      drugCatalog,
      diseaseCatalog,
      newId: () => "link-1",
    });

    const risks = await findContraindicationRisks([IBUPROFEN.id], [CKD.id], { contraindications });
    expect(risks).toHaveLength(1);
    expect(risks[0].type).toBe("contraindication");
  });

  it("returns no risks when the patient has no matching condition", async () => {
    const contraindications = new InMemoryContraindicationRepository();
    const risks = await findContraindicationRisks([IBUPROFEN.id], ["disease-other"], { contraindications });
    expect(risks).toEqual([]);
  });

  it("returns no risks when the patient has no recorded conditions at all", async () => {
    const contraindications = new InMemoryContraindicationRepository();
    const risks = await findContraindicationRisks([IBUPROFEN.id], [], { contraindications });
    expect(risks).toEqual([]);
  });
});
