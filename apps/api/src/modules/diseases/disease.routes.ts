import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { createDisease, listDiseases } from "./disease.repository.js";

export const diseaseRouter = Router();
diseaseRouter.use(requireAuth);

diseaseRouter.get("/", asyncHandler(async (_req, res) => {
  res.status(200).json(await listDiseases());
}));

diseaseRouter.post("/", asyncHandler(async (req, res) => {
  const { name, icdCode } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name is required." } });
  }
  res.status(201).json(await createDisease(name.trim(), typeof icdCode === "string" ? icdCode : undefined));
}));
