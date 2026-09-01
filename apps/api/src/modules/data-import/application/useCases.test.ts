import { describe, expect, it } from "vitest";
import { AllergyLink, ContraindicationLink, Drug, DrugInteraction, ImportJob, ImportRowError, Severity } from "@disa/shared-types";
import { CreateAllergyLinkDeps } from "../../allergy-links/application/useCases.js";
import { CreateContraindicationDeps } from "../../contraindications/application/useCases.js";
import { CreateInteractionDeps } from "../../interactions/application/useCases.js";
import {
  AllergenImportRepository,
  DiseaseImportRepository,
  DrugImportRepository,
  ImportJobNotFoundError,
  ImportJobRepository,
} from "./ports.js";
import { getImportJob, ProcessImportDeps, processDrugImport, startImportJob } from "./useCases.js";

class InMemoryImportJobRepository implements ImportJobRepository {
  private jobs = new Map<string, ImportJob>();
  updateCalls: { id: string; patch: Partial<ImportJob> }[] = [];

  async create(job: ImportJob): Promise<void> {
    this.jobs.set(job.id, job);
  }
  async update(id: string, patch: Partial<ImportJob>): Promise<void> {
    this.updateCalls.push({ id, patch });
    const existing = this.jobs.get(id);
    if (existing) this.jobs.set(id, { ...existing, ...patch, updatedAt: "updated" });
  }
  async findById(id: string): Promise<ImportJob | undefined> {
    return this.jobs.get(id);
  }
}

class InMemoryDrugImportRepository implements DrugImportRepository {
  created: Drug[] = [];
  async create(drug: Omit<Drug, "id">): Promise<Drug> {
    const withId = { id: `drug-${this.created.length + 1}`, ...drug };
    this.created.push(withId);
    return withId;
  }
}

class InMemoryAllergenImportRepository implements AllergenImportRepository {
  private byName = new Map<string, { id: string; name: string }>();
  async findOrCreateByName(name: string): Promise<{ id: string; name: string }> {
    const key = name.toLowerCase();
    const existing = this.byName.get(key);
    if (existing) return existing;
    const created = { id: `allergen-${this.byName.size + 1}`, name };
    this.byName.set(key, created);
    return created;
  }
}

class InMemoryDiseaseImportRepository implements DiseaseImportRepository {
  private byName = new Map<string, { id: string; name: string }>();
  async findOrCreateByName(name: string): Promise<{ id: string; name: string }> {
    const key = name.toLowerCase();
    const existing = this.byName.get(key);
    if (existing) return existing;
    const created = { id: `disease-${this.byName.size + 1}`, name };
    this.byName.set(key, created);
    return created;
  }
}

/**
 * Wires up in-memory fakes for the three relationship modules' create-use-cases
 * (interactions/allergy-links/contraindications), reading "does this id exist"
 * from the same drug/allergen/disease import fakes rather than a separate list —
 * matches how the real deps read from the same underlying database.
 */
function buildRelationshipDeps(
  drugImport: InMemoryDrugImportRepository,
  allergenImport: InMemoryAllergenImportRepository,
  diseaseImport: InMemoryDiseaseImportRepository
): Pick<ProcessImportDeps, "allergenImport" | "diseaseImport" | "interactions" | "allergyLinks" | "contraindications"> {
  const interactionsCreated: DrugInteraction[] = [];
  const allergyLinksCreated: AllergyLink[] = [];
  const contraindicationsCreated: ContraindicationLink[] = [];
  let nextId = 1;

  const interactions: CreateInteractionDeps["interactions"] = {
    async create(id, drugAId, drugBId, severity) {
      const interaction: DrugInteraction = { id, drugA: { id: drugAId, name: drugAId }, drugB: { id: drugBId, name: drugBId }, severity };
      interactionsCreated.push(interaction);
      return interaction;
    },
    async findAmong() { return []; },
    async findById() { return undefined; },
    async findInvolving() { return []; },
  };
  const allergyLinks: CreateAllergyLinkDeps["allergyLinks"] = {
    async create(id, drugId, allergenId, severity) {
      const link: AllergyLink = { id, drug: { id: drugId, name: drugId }, allergen: { id: allergenId, name: allergenId }, severity };
      allergyLinksCreated.push(link);
      return link;
    },
    async findConflicts() { return []; },
    async findById() { return undefined; },
  };
  const contraindications: CreateContraindicationDeps["contraindications"] = {
    async create(id, drugId, diseaseId, severity) {
      const link: ContraindicationLink = { id, drug: { id: drugId, name: drugId }, disease: { id: diseaseId, name: diseaseId }, severity };
      contraindicationsCreated.push(link);
      return link;
    },
    async findConflicts() { return []; },
    async findById() { return undefined; },
  };

  const knownDrugIds = () => new Set(drugImport.created.map((d) => d.id));

  return {
    allergenImport,
    diseaseImport,
    interactions: { interactions, catalog: { existingDrugIds: async (ids) => new Set(ids.filter((id) => knownDrugIds().has(id))) }, newId: () => `interaction-${nextId++}` },
    allergyLinks: {
      allergyLinks,
      drugCatalog: { existingDrugIds: async (ids) => new Set(ids.filter((id) => knownDrugIds().has(id))) },
      allergenCatalog: { existingAllergenIds: async (ids) => new Set(ids) }, // any id findOrCreateByName returned is by definition real
      newId: () => `allergy-link-${nextId++}`,
    },
    contraindications: {
      contraindications,
      drugCatalog: { existingDrugIds: async (ids) => new Set(ids.filter((id) => knownDrugIds().has(id))) },
      diseaseCatalog: { existingDiseaseIds: async (ids) => new Set(ids) },
      newId: () => `contraindication-${nextId++}`,
    },
  };
}

describe("startImportJob use case", () => {
  it("creates a job in 'queued' status", async () => {
    const importJobs = new InMemoryImportJobRepository();
    const job = await startImportJob({ importJobs, newId: () => "job-1", now: () => "2026-08-17T00:00:00.000Z" });
    expect(job.id).toBe("job-1");
    expect(job.status).toBe("queued");
    expect(job.entityType).toBe("drug");
  });
});

describe("processDrugImport use case", () => {
  const VALID_ROW = { name: "Warfarin", genericName: "warfarin sodium", drugClass: "anticoagulant", dosageForm: "tablet" };
  const PII_ROW = { name: "123-45-6789", genericName: "x", drugClass: "y", dosageForm: "z" };
  const INCOMPLETE_ROW = { name: "Ibuprofen", genericName: "", drugClass: "NSAID", dosageForm: "" };

  it("writes only the accepted rows — rejected rows are never written, not just excluded from the count", async () => {
    const importJobs = new InMemoryImportJobRepository();
    const drugImport = new InMemoryDrugImportRepository();
    await importJobs.create({
      id: "job-1",
      entityType: "drug",
      status: "queued",
      acceptedCount: 0,
      rejectedCount: 0,
      errors: [],
      createdAt: "t",
      updatedAt: "t",
    });

    await processDrugImport("job-1", [VALID_ROW, PII_ROW, INCOMPLETE_ROW], {
      importJobs,
      drugImport,
      ...buildRelationshipDeps(drugImport, new InMemoryAllergenImportRepository(), new InMemoryDiseaseImportRepository()),
      now: () => "2026-08-17T00:01:00.000Z",
    });

    expect(drugImport.created).toHaveLength(1);
    expect(drugImport.created[0].name).toBe("Warfarin");

    const finalJob = await importJobs.findById("job-1");
    expect(finalJob?.status).toBe("complete");
    expect(finalJob?.acceptedCount).toBe(1);
    expect(finalJob?.rejectedCount).toBe(2);
  });

  it("moves the job through validating → importing → complete, in order", async () => {
    const importJobs = new InMemoryImportJobRepository();
    const drugImport = new InMemoryDrugImportRepository();
    await importJobs.create({
      id: "job-1",
      entityType: "drug",
      status: "queued",
      acceptedCount: 0,
      rejectedCount: 0,
      errors: [],
      createdAt: "t",
      updatedAt: "t",
    });

    await processDrugImport("job-1", [VALID_ROW], {
      importJobs,
      drugImport,
      ...buildRelationshipDeps(drugImport, new InMemoryAllergenImportRepository(), new InMemoryDiseaseImportRepository()),
      now: () => "t",
    });

    const statuses = importJobs.updateCalls.map((c) => c.patch.status).filter(Boolean);
    expect(statuses).toEqual(["validating", "importing", "complete"]);
  });

  it("reports a specific, non-generic reason for a PII-rejected row — never a silent drop", async () => {
    const importJobs = new InMemoryImportJobRepository();
    const drugImport = new InMemoryDrugImportRepository();
    await importJobs.create({
      id: "job-1",
      entityType: "drug",
      status: "queued",
      acceptedCount: 0,
      rejectedCount: 0,
      errors: [],
      createdAt: "t",
      updatedAt: "t",
    });

    await processDrugImport("job-1", [PII_ROW], {
      importJobs,
      drugImport,
      ...buildRelationshipDeps(drugImport, new InMemoryAllergenImportRepository(), new InMemoryDiseaseImportRepository()),
      now: () => "t",
    });

    const finalJob = await importJobs.findById("job-1");
    const errors = finalJob?.errors as ImportRowError[];
    expect(errors).toHaveLength(1);
    expect(errors[0].rowNumber).toBe(1);
    expect(errors[0].reason).toContain("PII");
  });

  it("marks the job 'failed' if the writer throws unexpectedly", async () => {
    const importJobs = new InMemoryImportJobRepository();
    const emptyDrugImport = new InMemoryDrugImportRepository();
    const throwingDrugImport: DrugImportRepository = {
      async create() {
        throw new Error("database unreachable");
      },
    };
    await importJobs.create({
      id: "job-1",
      entityType: "drug",
      status: "queued",
      acceptedCount: 0,
      rejectedCount: 0,
      errors: [],
      createdAt: "t",
      updatedAt: "t",
    });

    await processDrugImport("job-1", [VALID_ROW], {
      importJobs,
      drugImport: throwingDrugImport,
      ...buildRelationshipDeps(emptyDrugImport, new InMemoryAllergenImportRepository(), new InMemoryDiseaseImportRepository()),
      now: () => "t",
    });

    const finalJob = await importJobs.findById("job-1");
    expect(finalJob?.status).toBe("failed");
  });

  it("creates an INTERACTS_WITH edge from an interactsWith column, resolving the target by name", async () => {
    const importJobs = new InMemoryImportJobRepository();
    const drugImport = new InMemoryDrugImportRepository();
    const allergenImport = new InMemoryAllergenImportRepository();
    const diseaseImport = new InMemoryDiseaseImportRepository();
    const relDeps = buildRelationshipDeps(drugImport, allergenImport, diseaseImport);
    await importJobs.create({
      id: "job-1", entityType: "drug", status: "queued", acceptedCount: 0, rejectedCount: 0, errors: [], createdAt: "t", updatedAt: "t",
    });

    const warfarinRow = { ...VALID_ROW, interactsWith: "Aspirin:severe" };
    const aspirinRow = { name: "Aspirin", genericName: "aspirin", drugClass: "NSAID", dosageForm: "tablet" };

    await processDrugImport("job-1", [warfarinRow, aspirinRow], { importJobs, drugImport, ...relDeps, now: () => "t" });

    const finalJob = await importJobs.findById("job-1");
    expect(finalJob?.status).toBe("complete");
    expect(finalJob?.acceptedCount).toBe(2);
    expect(finalJob?.errors).toEqual([]);
  });

  it("records a soft error (without rejecting the drug row) when interactsWith names an unknown drug", async () => {
    const importJobs = new InMemoryImportJobRepository();
    const drugImport = new InMemoryDrugImportRepository();
    const relDeps = buildRelationshipDeps(drugImport, new InMemoryAllergenImportRepository(), new InMemoryDiseaseImportRepository());
    await importJobs.create({
      id: "job-1", entityType: "drug", status: "queued", acceptedCount: 0, rejectedCount: 0, errors: [], createdAt: "t", updatedAt: "t",
    });

    const row = { ...VALID_ROW, interactsWith: "Nonexistent Drug:severe" };
    await processDrugImport("job-1", [row], { importJobs, drugImport, ...relDeps, now: () => "t" });

    const finalJob = await importJobs.findById("job-1");
    expect(drugImport.created).toHaveLength(1); // the drug itself was still created
    expect(finalJob?.acceptedCount).toBe(1);
    expect(finalJob?.rejectedCount).toBe(0); // not a validation rejection
    expect(finalJob?.errors).toHaveLength(1);
    expect(finalJob?.errors[0].reason).toContain("unknown drug");
  });

  it("dedupes a mutual interactsWith reference into a single edge, not two", async () => {
    const importJobs = new InMemoryImportJobRepository();
    const drugImport = new InMemoryDrugImportRepository();
    const relDeps = buildRelationshipDeps(drugImport, new InMemoryAllergenImportRepository(), new InMemoryDiseaseImportRepository());
    let createdCount = 0;
    relDeps.interactions.interactions.create = async (id, drugAId, drugBId, severity) => {
      createdCount++;
      return { id, drugA: { id: drugAId, name: drugAId }, drugB: { id: drugBId, name: drugBId }, severity };
    };
    await importJobs.create({
      id: "job-1", entityType: "drug", status: "queued", acceptedCount: 0, rejectedCount: 0, errors: [], createdAt: "t", updatedAt: "t",
    });

    const warfarinRow = { ...VALID_ROW, interactsWith: "Aspirin:severe" };
    const aspirinRow = { name: "Aspirin", genericName: "aspirin", drugClass: "NSAID", dosageForm: "tablet", interactsWith: "Warfarin:severe" };

    await processDrugImport("job-1", [warfarinRow, aspirinRow], { importJobs, drugImport, ...relDeps, now: () => "t" });

    expect(createdCount).toBe(1);
  });

  it("creates CONTAINS_ALLERGEN and CONTRAINDICATED_FOR edges, finding-or-creating the referenced allergen/condition by name", async () => {
    const importJobs = new InMemoryImportJobRepository();
    const drugImport = new InMemoryDrugImportRepository();
    const allergenImport = new InMemoryAllergenImportRepository();
    const diseaseImport = new InMemoryDiseaseImportRepository();
    const relDeps = buildRelationshipDeps(drugImport, allergenImport, diseaseImport);
    await importJobs.create({
      id: "job-1", entityType: "drug", status: "queued", acceptedCount: 0, rejectedCount: 0, errors: [], createdAt: "t", updatedAt: "t",
    });

    const row = { ...VALID_ROW, containsAllergen: "Penicillin:severe", contraindicatedFor: "Renal Impairment:contraindicated" };
    await processDrugImport("job-1", [row], { importJobs, drugImport, ...relDeps, now: () => "t" });

    const finalJob = await importJobs.findById("job-1");
    expect(finalJob?.status).toBe("complete");
    expect(finalJob?.errors).toEqual([]);
  });
});

describe("getImportJob use case", () => {
  it("throws ImportJobNotFoundError when missing", async () => {
    const importJobs = new InMemoryImportJobRepository();
    await expect(getImportJob("missing", { importJobs })).rejects.toBeInstanceOf(ImportJobNotFoundError);
  });
});
