import { beforeEach, describe, expect, it } from "vitest";
import { Patient, PatientProfileFields, PatientSummary } from "@disa/shared-types";
import { AlreadyDeletedError, ProfileValidationError } from "../domain/patientProfile.js";
import { PatientNotFoundError, PatientRepository, ReferenceCatalogPort } from "./ports.js";
import { createPatient, deletePatient, getPatient, listDeletedPatients, listPatients, updatePatient } from "./useCases.js";

class InMemoryPatientRepository implements PatientRepository {
  private patients = new Map<string, Patient>();
  createCalls: PatientProfileFields[] = [];

  async create(id: string, profile: PatientProfileFields, createdAt: string): Promise<Patient> {
    this.createCalls.push(profile);
    const patient: Patient = { id, createdAt, ...profile };
    this.patients.set(id, patient);
    return patient;
  }

  async findById(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async list(): Promise<PatientSummary[]> {
    return [...this.patients.values()]
      .filter((p) => !p.deletedAt)
      .map((p) => ({ id: p.id, displayName: p.displayName, medicationCount: p.medicationIds.length }));
  }

  async update(id: string, profile: PatientProfileFields): Promise<Patient> {
    const existing = this.patients.get(id);
    if (!existing) throw new Error("not found");
    const updated: Patient = { ...existing, ...profile };
    this.patients.set(id, updated);
    return updated;
  }

  async softDelete(id: string, deletedAt: string): Promise<Patient> {
    const existing = this.patients.get(id);
    if (!existing) throw new Error("not found");
    const updated: Patient = { ...existing, deletedAt };
    this.patients.set(id, updated);
    return updated;
  }

  async listDeleted(): Promise<PatientSummary[]> {
    return [...this.patients.values()]
      .filter((p) => p.deletedAt)
      .map((p) => ({ id: p.id, displayName: p.displayName, medicationCount: p.medicationIds.length, deletedAt: p.deletedAt }));
  }
}

class FakeReferenceCatalog implements ReferenceCatalogPort {
  constructor(
    private drugs = new Set<string>(),
    private allergens = new Set<string>(),
    private conditions = new Set<string>()
  ) {}

  async existingDrugIds(ids: string[]): Promise<Set<string>> {
    return new Set(ids.filter((id) => this.drugs.has(id)));
  }
  async existingAllergenIds(ids: string[]): Promise<Set<string>> {
    return new Set(ids.filter((id) => this.allergens.has(id)));
  }
  async existingConditionIds(ids: string[]): Promise<Set<string>> {
    return new Set(ids.filter((id) => this.conditions.has(id)));
  }
}

describe("createPatient use case", () => {
  let patients: InMemoryPatientRepository;
  let catalog: FakeReferenceCatalog;
  let deps: { patients: PatientRepository; catalog: ReferenceCatalogPort; newId: () => string; now: () => string };

  beforeEach(() => {
    patients = new InMemoryPatientRepository();
    catalog = new FakeReferenceCatalog(new Set(["drug-1"]), new Set(["allergen-1"]), new Set(["disease-1"]));
    deps = { patients, catalog, newId: () => "patient-1", now: () => "2026-08-17T00:00:00.000Z" };
  });

  it("creates a patient when every reference exists", async () => {
    const result = await createPatient(
      { displayName: "Jane", medicationIds: ["drug-1"], allergyIds: ["allergen-1"], conditionIds: ["disease-1"] },
      deps
    );
    expect(result.id).toBe("patient-1");
    expect(patients.createCalls).toHaveLength(1);
  });

  it("rejects and never calls the repository when a medication id is unknown", async () => {
    await expect(
      createPatient(
        { displayName: "Jane", medicationIds: ["drug-999"], allergyIds: [], conditionIds: [] },
        deps
      )
    ).rejects.toBeInstanceOf(ProfileValidationError);
    expect(patients.createCalls).toHaveLength(0);
  });
});

describe("updatePatient use case", () => {
  it("throws PatientNotFoundError for an unknown id", async () => {
    const patients = new InMemoryPatientRepository();
    const catalog = new FakeReferenceCatalog();
    await expect(
      updatePatient("missing-id", { displayName: "New Name" }, { patients, catalog })
    ).rejects.toBeInstanceOf(PatientNotFoundError);
  });

  it("merges partial changes onto the existing profile and re-validates references", async () => {
    const patients = new InMemoryPatientRepository();
    const catalog = new FakeReferenceCatalog(new Set(["drug-1", "drug-2"]), new Set(), new Set());
    await patients.create(
      "patient-1",
      { displayName: "Jane", medicationIds: ["drug-1"], allergyIds: [], conditionIds: [] },
      "2026-08-17T00:00:00.000Z"
    );

    const updated = await updatePatient("patient-1", { medicationIds: ["drug-1", "drug-2"] }, { patients, catalog });

    expect(updated.displayName).toBe("Jane");
    expect(updated.medicationIds).toEqual(["drug-1", "drug-2"]);
  });
});

describe("getPatient / listPatients use cases", () => {
  it("getPatient throws PatientNotFoundError when missing", async () => {
    const patients = new InMemoryPatientRepository();
    await expect(getPatient("missing", { patients })).rejects.toBeInstanceOf(PatientNotFoundError);
  });

  it("listPatients returns summaries derived from stored patients", async () => {
    const patients = new InMemoryPatientRepository();
    await patients.create(
      "patient-1",
      { displayName: "Jane", medicationIds: ["drug-1"], allergyIds: [], conditionIds: [] },
      "2026-08-17T00:00:00.000Z"
    );
    const summaries = await listPatients({ patients });
    expect(summaries).toEqual([{ id: "patient-1", displayName: "Jane", medicationCount: 1 }]);
  });
});

describe("deletePatient / listDeletedPatients use cases", () => {
  it("throws PatientNotFoundError for an unknown id", async () => {
    const patients = new InMemoryPatientRepository();
    await expect(deletePatient("missing-id", { patients, now: () => "2026-08-19T00:00:00.000Z" })).rejects.toBeInstanceOf(
      PatientNotFoundError
    );
  });

  it("soft-deletes an active patient and removes it from the active list", async () => {
    const patients = new InMemoryPatientRepository();
    await patients.create(
      "patient-1",
      { displayName: "Jane", medicationIds: [], allergyIds: [], conditionIds: [] },
      "2026-08-17T00:00:00.000Z"
    );

    const deleted = await deletePatient("patient-1", { patients, now: () => "2026-08-19T00:00:00.000Z" });

    expect(deleted.deletedAt).toBe("2026-08-19T00:00:00.000Z");
    expect(await listPatients({ patients })).toEqual([]);
    expect(await listDeletedPatients({ patients })).toEqual([
      { id: "patient-1", displayName: "Jane", medicationCount: 0, deletedAt: "2026-08-19T00:00:00.000Z" },
    ]);
  });

  it("rejects deleting an already-deleted patient", async () => {
    const patients = new InMemoryPatientRepository();
    await patients.create(
      "patient-1",
      { displayName: "Jane", medicationIds: [], allergyIds: [], conditionIds: [] },
      "2026-08-17T00:00:00.000Z"
    );
    await deletePatient("patient-1", { patients, now: () => "2026-08-19T00:00:00.000Z" });

    await expect(deletePatient("patient-1", { patients, now: () => "2026-08-19T01:00:00.000Z" })).rejects.toBeInstanceOf(
      AlreadyDeletedError
    );
  });
});
