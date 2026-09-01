import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { AuthError, login, register } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || username.length < 3 || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "username (min 3 chars) and password (min 8 chars) are required." },
    });
  }
  try {
    await register(username, password);
    res.status(201).json({ username });
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(409).json({ error: { code: err.code, message: err.message } });
    }
    throw err;
  }
}));

authRouter.post("/login", asyncHandler(async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "username and password are required." },
    });
  }
  try {
    const result = await login(username, password);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return res.status(401).json({ error: { code: err.code, message: err.message } });
    }
    throw err;
  }
}));
