import { Router } from "express";
import { prisma } from "../db/client";
import { getDefaultUser } from "../db/defaultUser";
import { resolveTicker } from "../ingestion/tickerResolver";
import { ingestCompany } from "../ingestion/jobs/ingestCompany";
import { asyncHandler } from "./asyncHandler";

export const watchlistRouter = Router();

watchlistRouter.get("/", asyncHandler(async (_req, res) => {
  const user = await getDefaultUser();

  const items = await prisma.watchlistItem.findMany({
    where: { userId: user.id },
    include: {
      company: {
        include: {
          scores: { orderBy: { computedAt: "desc" }, take: 3 },
          filings: { orderBy: { filingDate: "desc" }, take: 1 },
        },
      },
    },
  });

  res.json(
    items.map((item) => ({
      company: {
        id: item.company.id,
        cik: item.company.cik,
        ticker: item.company.ticker,
        name: item.company.name,
      },
      latestScores: item.company.scores,
      lastFilingDate: item.company.filings[0]?.filingDate ?? null,
    }))
  );
}));

watchlistRouter.post("/", asyncHandler(async (req, res) => {
  const ticker = String(req.body?.ticker ?? "").trim();
  if (!ticker) return res.status(400).json({ error: "ticker is required" });

  const resolved = await resolveTicker(ticker);
  if (!resolved) return res.status(404).json({ error: `unknown ticker: ${ticker}` });

  const user = await getDefaultUser();

  const company = await prisma.company.upsert({
    where: { cik: resolved.cik },
    update: {},
    create: { cik: resolved.cik, ticker: resolved.ticker, name: resolved.name },
  });

  await prisma.watchlistItem.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: {},
    create: { userId: user.id, companyId: company.id },
  });

  // Kick off an immediate ingest so the user sees data without waiting for the next cron tick.
  ingestCompany(company).catch((err) => console.error(`ingestCompany(${company.ticker}) failed:`, err));

  res.status(201).json({ company });
}));

watchlistRouter.delete("/:companyId", asyncHandler(async (req, res) => {
  const user = await getDefaultUser();

  await prisma.watchlistItem.deleteMany({
    where: { userId: user.id, companyId: req.params.companyId },
  });

  res.status(204).send();
}));
