import type { Company, FormType } from "@prisma/client";
import { prisma } from "../../db/client";
import { fetchRecentFilings } from "../submissionsFetcher";
import { fetchCompanyFacts, getFactsForAccession } from "../xbrlFactsFetcher";
import { RELEVANT_TAGS } from "../relevantConcepts";
import { computePiotroskiFScore } from "../../scoring/piotroski";
import { diffFilings } from "../../diffing/diffEngine";

export interface IngestResult {
  companyId: string;
  newFilingsCount: number;
  errors: string[];
}

export async function ingestCompany(company: Company): Promise<IngestResult> {
  const errors: string[] = [];
  let newFilingsCount = 0;

  const [recentFilings, companyFacts] = await Promise.all([
    fetchRecentFilings(company.cik),
    fetchCompanyFacts(company.cik),
  ]);

  for (const fetched of recentFilings) {
    const existing = await prisma.filing.findUnique({
      where: { accessionNumber: fetched.accessionNumber },
    });
    if (existing) continue;

    try {
      const filing = await prisma.filing.create({
        data: {
          companyId: company.id,
          accessionNumber: fetched.accessionNumber,
          formType: fetched.formType,
          filingDate: new Date(fetched.filingDate),
          periodOfReport: new Date(fetched.periodOfReport),
          fiscalYear: fetched.fiscalYear,
          fiscalPeriod: fetched.fiscalPeriod,
          primaryDocumentUrl: fetched.primaryDocumentUrl,
        },
      });
      newFilingsCount++;

      const extractedFacts = getFactsForAccession(companyFacts, fetched.accessionNumber).filter(
        (f) => RELEVANT_TAGS.has(f.concept)
      );

      for (const fact of extractedFacts) {
        await prisma.xbrlFactSnapshot.upsert({
          where: {
            uniqueFact: {
              companyId: company.id,
              concept: fact.concept,
              endDate: new Date(fact.endDate),
              unit: fact.unit,
              filingId: filing.id,
            },
          },
          update: { value: fact.value },
          create: {
            companyId: company.id,
            filingId: filing.id,
            concept: fact.concept,
            taxonomy: fact.taxonomy,
            value: fact.value,
            unit: fact.unit,
            startDate: fact.startDate ? new Date(fact.startDate) : null,
            endDate: new Date(fact.endDate),
            formType: fact.formType === "10-K" ? "TEN_K" : "TEN_Q",
          },
        });
      }

      const factRows = extractedFacts.map((f) => ({
        concept: f.concept,
        value: f.value,
        startDate: f.startDate,
        endDate: f.endDate,
      }));

      const piotroski = computePiotroskiFScore(factRows, new Date(fetched.periodOfReport));

      await prisma.redFlagScore.upsert({
        where: {
          companyId_fiscalYear_fiscalPeriod_scoreType: {
            companyId: company.id,
            fiscalYear: fetched.fiscalYear,
            fiscalPeriod: fetched.fiscalPeriod,
            scoreType: "piotroski_f",
          },
        },
        update: {
          filingId: filing.id,
          scoreValue: piotroski.scoreValue,
          riskLevel: piotroski.riskLevel,
          inputs: piotroski.inputs as any,
        },
        create: {
          companyId: company.id,
          filingId: filing.id,
          fiscalYear: fetched.fiscalYear,
          fiscalPeriod: fetched.fiscalPeriod,
          scoreType: "piotroski_f",
          scoreValue: piotroski.scoreValue,
          riskLevel: piotroski.riskLevel,
          inputs: piotroski.inputs as any,
        },
      });

      await maybeCreateScoreAlert(company, filing.id, piotroski);
      await diffAgainstPriorFiling(company, filing.id, fetched.formType);
      await createAlert(company.id, {
        alertType: "new_filing",
        referenceId: filing.id,
        title: `${company.ticker}: new ${fetched.formType} filed`,
        message: `${company.name} filed a ${fetched.formType} for period ending ${fetched.periodOfReport}.`,
        severity: "low",
      });
    } catch (err) {
      errors.push(`${company.ticker} ${fetched.accessionNumber}: ${(err as Error).message}`);
    }
  }

  return { companyId: company.id, newFilingsCount, errors };
}

async function maybeCreateScoreAlert(
  company: Company,
  filingId: string,
  piotroski: { scoreValue: number | null; riskLevel: string }
) {
  if (piotroski.riskLevel !== "high") return;

  await createAlert(company.id, {
    alertType: "score_threshold_breach",
    referenceId: filingId,
    title: `${company.ticker}: Piotroski F-Score flags high risk`,
    message: `${company.name}'s latest filing scores ${piotroski.scoreValue}/9 on the Piotroski F-Score (high risk range).`,
    severity: "high",
  });
}

async function diffAgainstPriorFiling(company: Company, newFilingId: string, formType: FormType) {
  const newFiling = await prisma.filing.findUniqueOrThrow({ where: { id: newFilingId } });

  const priorFiling = await prisma.filing.findFirst({
    where: {
      companyId: company.id,
      formType,
      filingDate: { lt: newFiling.filingDate },
    },
    orderBy: { filingDate: "desc" },
  });
  if (!priorFiling) return;

  const [newFacts, priorFacts] = await Promise.all([
    prisma.xbrlFactSnapshot.findMany({ where: { filingId: newFiling.id } }),
    prisma.xbrlFactSnapshot.findMany({ where: { filingId: priorFiling.id } }),
  ]);

  const diffLines = diffFilings(newFacts, priorFacts);

  for (const line of diffLines) {
    if (line.priorValue === null || line.newValue === null) continue;
    await prisma.filingDiff.create({
      data: {
        companyId: company.id,
        filingIdNew: newFiling.id,
        filingIdPrior: priorFiling.id,
        concept: line.concept,
        priorValue: line.priorValue,
        newValue: line.newValue,
        deltaAbs: line.deltaAbs,
        deltaPct: line.deltaPct,
        materialityFlag: line.materialityFlag,
      },
    });
  }

  const materialLines = diffLines.filter((l) => l.materialityFlag);
  if (materialLines.length > 0) {
    await createAlert(company.id, {
      alertType: "material_diff",
      referenceId: newFiling.id,
      title: `${company.ticker}: material filing changes detected`,
      message: `${materialLines.length} line item(s) changed by more than the materiality threshold vs. the prior filing.`,
      severity: "medium",
    });
  }
}

async function createAlert(
  companyId: string,
  data: { alertType: "new_filing" | "material_diff" | "score_threshold_breach"; referenceId: string; title: string; message: string; severity: "low" | "medium" | "high" }
) {
  const { getDefaultUser } = await import("../../db/defaultUser");
  const user = await getDefaultUser();

  await prisma.alert.create({
    data: {
      userId: user.id,
      companyId,
      alertType: data.alertType,
      referenceId: data.referenceId,
      title: data.title,
      message: data.message,
      severity: data.severity,
    },
  });
}
