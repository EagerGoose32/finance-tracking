import type { NextFunction, Request, Response } from "express";

const API_KEY = process.env.API_KEY;

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/health") return next();

  if (!API_KEY) {
    // No key configured (e.g. local dev without .env) — allow through.
    return next();
  }

  if (req.header("x-api-key") !== API_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }

  next();
}
