import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { createAllergen, listAllergens } from "./allergen.repository.js";

export const allergenRouter = Router();
allergenRouter.use(requireAuth);

allergenRouter.get("/", asyncHandler(async (_req, res) => {
  res.status(200).json(await listAllergens());
}));

allergenRouter.post("/", asyncHandler(async (req, res) => {
  const { name } = req.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name is required." } });
  }
  res.status(201).json(await createAllergen(name.trim()));
}));
