import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  createDrug,
  deleteDrug,
  DrugAlreadyDeletedError,
  DrugNotFoundError,
  listDeletedDrugs,
  listDrugs,
  updateDrug,
} from "./drug.repository.js";

export const drugRouter = Router();

drugRouter.use(requireAuth);

function parseDrugFields(body: unknown): { name: string; genericName: string; drugClass: string; dosageForm: string } | null {
  const { name, genericName, drugClass, dosageForm } = (body as Record<string, unknown>) ?? {};
  if (
    typeof name !== "string" || !name ||
    typeof genericName !== "string" || !genericName ||
    typeof drugClass !== "string" || !drugClass ||
    typeof dosageForm !== "string" || !dosageForm
  ) {
    return null;
  }
  return { name, genericName, drugClass, dosageForm };
}

drugRouter.get("/", asyncHandler(async (_req, res) => {
  const drugs = await listDrugs();
  res.status(200).json(drugs);
}));

drugRouter.get("/deleted", asyncHandler(async (_req, res) => {
  res.status(200).json(await listDeletedDrugs());
}));

drugRouter.post("/", asyncHandler(async (req, res) => {
  const fields = parseDrugFields(req.body);
  if (!fields) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "name, genericName, drugClass, dosageForm are all required." },
    });
  }
  const drug = await createDrug(fields);
  res.status(201).json(drug);
}));

drugRouter.put("/:id", asyncHandler(async (req, res) => {
  const fields = parseDrugFields(req.body);
  if (!fields) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "name, genericName, drugClass, dosageForm are all required." },
    });
  }
  try {
    const drug = await updateDrug(req.params.id, fields);
    res.status(200).json(drug);
  } catch (err) {
    if (err instanceof DrugNotFoundError) {
      return res.status(404).json({ error: { code: "DRUG_NOT_FOUND", message: err.message } });
    }
    throw err;
  }
}));

drugRouter.delete("/:id", asyncHandler(async (req, res) => {
  try {
    const drug = await deleteDrug(req.params.id);
    res.status(200).json(drug);
  } catch (err) {
    if (err instanceof DrugNotFoundError) {
      return res.status(404).json({ error: { code: "DRUG_NOT_FOUND", message: err.message } });
    }
    if (err instanceof DrugAlreadyDeletedError) {
      return res.status(409).json({ error: { code: "ALREADY_DELETED", message: err.message } });
    }
    throw err;
  }
}));
