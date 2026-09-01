import { beforeEach, describe, expect, it } from "vitest";
import { AllergyLink, Severity } from "@disa/shared-types";
import { AllergyLinkValidationError } from "../domain/allergyLink.js";
import {
  AllergenCatalogPort,
  AllergenNotFoundError,
  AllergyLinkRepository,
  DrugCatalogPort,
  DrugNotFoundError,
} from "./ports.js";
import { createAllergyLink, findAllergyRisks } from "./useCases.js";

const AMOXICILLIN = { id: "drug-1", name: "Amoxicillin" };
const PENICILLIN = { id: "allergen-1", name: "Penicillin" };

class InMemoryAllergyLinkRepository implements AllergyLinkRepository {
  private links: AllergyLink[] = [];
  createCalls: { drugId: string; allergenId: string; severity: Severity }[] = [];

  async create(id: string, drugId: string, allergenId: string, severity: Severity): Promise<AllergyLink> {
    this.createCalls.push({ drugId, allergenId, severity });
    const link: AllergyLink = { id, drug: AMOXICILLIN, allergen: PENICILLIN, severity };
    this.links.push(link);
    return link;
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

class FakeDrugCatalog implements DrugCatalogPort {
  constructor(private drugs = new Set<string>()) {}
  async existingDrugIds(ids: string[]): Promise<Set<string>> {
    return new Set(ids.filter((id) => this.drugs.has(id)));
  }
}

class FakeAllergenCatalog implements AllergenCatalogPort {
  constructor(private allergens = new Set<string>()) {}
  async existingAllergenIds(ids: string[]): Promise<Set<string>> {
    return new Set(ids.filter((id) => this.allergens.has(id)));
  }
}

describe("createAllergyLink use case", () => {
  let allergyLinks: InMemoryAllergyLinkRepository;
  let drugCatalog: FakeDrugCatalog;
  let allergenCatalog: FakeAllergenCatalog;

  beforeEach(() => {
    allergyLinks = new InMemoryAllergyLinkRepository();
    drugCatalog = new FakeDrugCatalog(new Set([AMOXICILLIN.id]));
    allergenCatalog = new FakeAllergenCatalog(new Set([PENICILLIN.id]));
  });

  it("creates a link when severity is valid and both nodes exist", async () => {
    const result = await createAllergyLink(AMOXICILLIN.id, PENICILLIN.id, "contraindicated", {
      allergyLinks,
      drugCatalog,
      allergenCatalog,
      newId: () => "link-1",
    });
    expect(result.id).toBe("link-1");
    expect(allergyLinks.createCalls).toHaveLength(1);
  });

  it("rejects and never calls the repository when severity is missing", async () => {
    await expect(
      createAllergyLink(AMOXICILLIN.id, PENICILLIN.id, undefined, {
        allergyLinks,
        drugCatalog,
        allergenCatalog,
        newId: () => "link-1",
      })
    ).rejects.toBeInstanceOf(AllergyLinkValidationError);
    expect(allergyLinks.createCalls).toHaveLength(0);
  });

  it("rejects when the drug doesn't exist", async () => {
    await expect(
      createAllergyLink("drug-999", PENICILLIN.id, "severe", { allergyLinks, drugCatalog, allergenCatalog, newId: () => "link-1" })
    ).rejects.toBeInstanceOf(DrugNotFoundError);
  });

  it("rejects when the allergen doesn't exist", async () => {
    await expect(
      createAllergyLink(AMOXICILLIN.id, "allergen-999", "severe", { allergyLinks, drugCatalog, allergenCatalog, newId: () => "link-1" })
    ).rejects.toBeInstanceOf(AllergenNotFoundError);
  });
});

describe("findAllergyRisks use case", () => {
  it("returns a risk when a medication contains an allergen the patient is allergic to", async () => {
    const allergyLinks = new InMemoryAllergyLinkRepository();
    const drugCatalog = new FakeDrugCatalog(new Set([AMOXICILLIN.id]));
    const allergenCatalog = new FakeAllergenCatalog(new Set([PENICILLIN.id]));
    await createAllergyLink(AMOXICILLIN.id, PENICILLIN.id, "severe", {
      allergyLinks,
      drugCatalog,
      allergenCatalog,
      newId: () => "link-1",
    });

    const risks = await findAllergyRisks([AMOXICILLIN.id], [PENICILLIN.id], { allergyLinks });
    expect(risks).toHaveLength(1);
    expect(risks[0].type).toBe("allergy");
  });

  it("returns no risks when the patient has no matching allergy", async () => {
    const allergyLinks = new InMemoryAllergyLinkRepository();
    const risks = await findAllergyRisks([AMOXICILLIN.id], ["allergen-other"], { allergyLinks });
    expect(risks).toEqual([]);
  });

  it("returns no risks when the patient has no recorded allergies at all", async () => {
    const allergyLinks = new InMemoryAllergyLinkRepository();
    const risks = await findAllergyRisks([AMOXICILLIN.id], [], { allergyLinks });
    expect(risks).toEqual([]);
  });
});
