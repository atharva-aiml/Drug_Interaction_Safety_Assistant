import { Patient, PatientProfileFields, PatientSummary } from "@disa/shared-types";
import {
  assertNotAlreadyDeleted,
  assertReferencesExist,
  ExistingReferenceSets,
  normalizeProfileInput,
} from "../domain/patientProfile.js";
import { PatientNotFoundError, PatientRepository, ReferenceCatalogPort } from "./ports.js";

export interface UseCaseDeps {
  patients: PatientRepository;
  catalog: ReferenceCatalogPort;
  newId: () => string;
  now: () => string;
}

async function resolveExistingSets(
  input: PatientProfileFields,
  catalog: ReferenceCatalogPort
): Promise<ExistingReferenceSets> {
  const [drugIds, allergenIds, conditionIds] = await Promise.all([
    catalog.existingDrugIds(input.medicationIds),
    catalog.existingAllergenIds(input.allergyIds),
    catalog.existingConditionIds(input.conditionIds),
  ]);
  return { drugIds, allergenIds, conditionIds };
}

export async function createPatient(input: PatientProfileFields, deps: UseCaseDeps): Promise<Patient> {
  const normalized = normalizeProfileInput(input);
  const existing = await resolveExistingSets(normalized, deps.catalog);
  assertReferencesExist(normalized, existing);
  return deps.patients.create(deps.newId(), normalized, deps.now());
}

export async function updatePatient(
  id: string,
  changes: Partial<PatientProfileFields>,
  deps: Pick<UseCaseDeps, "patients" | "catalog">
): Promise<Patient> {
  const current = await deps.patients.findById(id);
  if (!current) {
    throw new PatientNotFoundError(id);
  }
  const merged: PatientProfileFields = {
    displayName: changes.displayName ?? current.displayName,
    medicationIds: changes.medicationIds ?? current.medicationIds,
    allergyIds: changes.allergyIds ?? current.allergyIds,
    conditionIds: changes.conditionIds ?? current.conditionIds,
  };
  const normalized = normalizeProfileInput(merged);
  const existing = await resolveExistingSets(normalized, deps.catalog);
  assertReferencesExist(normalized, existing);
  return deps.patients.update(id, normalized);
}

export async function getPatient(id: string, deps: Pick<UseCaseDeps, "patients">): Promise<Patient> {
  const patient = await deps.patients.findById(id);
  if (!patient) {
    throw new PatientNotFoundError(id);
  }
  return patient;
}

export async function listPatients(deps: Pick<UseCaseDeps, "patients">): Promise<PatientSummary[]> {
  return deps.patients.list();
}

export async function deletePatient(
  id: string,
  deps: Pick<UseCaseDeps, "patients" | "now">
): Promise<Patient> {
  const current = await deps.patients.findById(id);
  if (!current) {
    throw new PatientNotFoundError(id);
  }
  assertNotAlreadyDeleted(current);
  return deps.patients.softDelete(id, deps.now());
}

export async function listDeletedPatients(deps: Pick<UseCaseDeps, "patients">): Promise<PatientSummary[]> {
  return deps.patients.listDeleted();
}
