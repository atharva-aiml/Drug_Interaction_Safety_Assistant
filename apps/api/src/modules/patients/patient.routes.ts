import { Router } from "express";
import { v4 as uuid } from "uuid";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { AlreadyDeletedError, ProfileValidationError } from "./domain/patientProfile.js";
import { PatientNotFoundError } from "./application/ports.js";
import {
  createPatient,
  deletePatient,
  getPatient,
  listDeletedPatients,
  listPatients,
  updatePatient,
  UseCaseDeps,
} from "./application/useCases.js";
import { Neo4jPatientRepository } from "./infrastructure/neo4jPatientRepository.js";
import { Neo4jReferenceCatalog } from "./infrastructure/neo4jReferenceCatalog.js";

const deps: UseCaseDeps = {
  patients: new Neo4jPatientRepository(),
  catalog: new Neo4jReferenceCatalog(),
  newId: () => uuid(),
  now: () => new Date().toISOString(),
};

export const patientRouter = Router();
patientRouter.use(requireAuth);

patientRouter.get("/", asyncHandler(async (_req, res) => {
  res.status(200).json(await listPatients(deps));
}));

patientRouter.post("/", asyncHandler(async (req, res) => {
  const { displayName, medicationIds, allergyIds, conditionIds } = req.body ?? {};
  try {
    const patient = await createPatient(
      {
        displayName,
        medicationIds: Array.isArray(medicationIds) ? medicationIds : [],
        allergyIds: Array.isArray(allergyIds) ? allergyIds : [],
        conditionIds: Array.isArray(conditionIds) ? conditionIds : [],
      },
      deps
    );
    res.status(201).json(patient);
  } catch (err) {
    if (err instanceof ProfileValidationError) {
      return res.status(400).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    throw err;
  }
}));

patientRouter.get("/deleted", asyncHandler(async (_req, res) => {
  res.status(200).json(await listDeletedPatients(deps));
}));

patientRouter.get("/:id", asyncHandler(async (req, res) => {
  try {
    res.status(200).json(await getPatient(req.params.id, deps));
  } catch (err) {
    if (err instanceof PatientNotFoundError) {
      return res.status(404).json({ error: { code: "PATIENT_NOT_FOUND", message: err.message } });
    }
    throw err;
  }
}));

patientRouter.put("/:id", asyncHandler(async (req, res) => {
  const { displayName, medicationIds, allergyIds, conditionIds } = req.body ?? {};
  try {
    const patient = await updatePatient(
      req.params.id,
      {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(medicationIds !== undefined ? { medicationIds } : {}),
        ...(allergyIds !== undefined ? { allergyIds } : {}),
        ...(conditionIds !== undefined ? { conditionIds } : {}),
      },
      deps
    );
    res.status(200).json(patient);
  } catch (err) {
    if (err instanceof ProfileValidationError) {
      return res.status(400).json({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err instanceof PatientNotFoundError) {
      return res.status(404).json({ error: { code: "PATIENT_NOT_FOUND", message: err.message } });
    }
    throw err;
  }
}));

patientRouter.delete("/:id", asyncHandler(async (req, res) => {
  try {
    const patient = await deletePatient(req.params.id, deps);
    res.status(200).json(patient);
  } catch (err) {
    if (err instanceof PatientNotFoundError) {
      return res.status(404).json({ error: { code: "PATIENT_NOT_FOUND", message: err.message } });
    }
    if (err instanceof AlreadyDeletedError) {
      return res.status(409).json({ error: { code: "ALREADY_DELETED", message: err.message } });
    }
    throw err;
  }
}));
