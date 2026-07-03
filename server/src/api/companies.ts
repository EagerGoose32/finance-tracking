import { Router } from "express";
import { prisma } from "../db/client";
import { diffFilings } from "../diffing/diffEngine";
import { asyncHandler } from "./asyncHandler";

export const companiesRouter = Router();

companiesRouter.get("/:id", asyncHandler(async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: {
      filings: { orderBy: { filingDate: "desc" }, take: 10 },
      scores: { orderBy: { computedAt: "desc" }, take: 10 },
    },
  });
  if (!company) return res.status(404).json({ error: "company not found" });
  res.json(company);
}));

companiesRouter.get("/:id/scores", asyncHandler(async (req, res) => {
  const scoreType = req.query.type ? String(req.query.type) : undefined;

  const scores = await prisma.redFlagScore.findMany({
    where: { companyId: req.params.id, ...(scoreType ? { scoreType: scoreType as any } : {}) },
    orderBy: [{ fiscalYear: "asc" }, { fiscalPeriod: "asc" }],
  });

  res.json(scores);
}));

companiesRouter.get("/:id/filings", asyncHandler(async (req, res) => {
  const filings = await prisma.filing.findMany({
    where: { companyId: req.params.id },
    orderBy: { filingDate: "desc" },
  });
  res.json(filings);
}));

companiesRouter.get("/:id/filings/:filingId/diff", asyncHandler(async (req, res) => {
  const newFiling = await prisma.filing.findUnique({ where: { id: req.params.filingId } });
  if (!newFiling || newFiling.companyId !== req.params.id) {
    return res.status(404).json({ error: "filing not found" });
  }

  const priorFiling = await prisma.filing.findFirst({
    where: {
      companyId: req.params.id,
      formType: newFiling.formType,
      filingDate: { lt: newFiling.filingDate },
    },
    orderBy: { filingDate: "desc" },
  });

  if (!priorFiling) {
    return res.json({ newFiling, priorFiling: null, diffLines: [] });
  }

  const [newFacts, priorFacts] = await Promise.all([
    prisma.xbrlFactSnapshot.findMany({ where: { filingId: newFiling.id } }),
    prisma.xbrlFactSnapshot.findMany({ where: { filingId: priorFiling.id } }),
  ]);

  res.json({ newFiling, priorFiling, diffLines: diffFilings(newFacts, priorFacts) });
}));
