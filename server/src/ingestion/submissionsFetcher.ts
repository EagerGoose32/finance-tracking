import { edgarGetJson } from "./edgarClient";
import type { FormType } from "@prisma/client";

interface SubmissionsRecent {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  form: string[];
  primaryDocument: string[];
  fiscalYear?: (string | null)[];
  fiscalPeriod?: (string | null)[];
}

interface SubmissionsResponse {
  cik: string;
  filings: {
    recent: SubmissionsRecent;
  };
}

export interface FetchedFiling {
  accessionNumber: string;
  formType: FormType;
  filingDate: string;
  periodOfReport: string;
  fiscalYear: number;
  fiscalPeriod: string;
  primaryDocumentUrl: string;
}

const RELEVANT_FORMS: Record<string, FormType> = {
  "10-K": "TEN_K",
  "10-Q": "TEN_Q",
};

function inferFiscalPeriod(reportDate: string, form: string): { year: number; period: string } {
  const year = new Date(reportDate).getUTCFullYear();
  if (form === "10-K") return { year, period: "FY" };

  // SEC submissions API doesn't always include fiscalPeriod for 10-Qs;
  // approximate from the report month. Good enough for MVP diff/scoring grouping.
  const month = new Date(reportDate).getUTCMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return { year, period: `Q${quarter}` };
}

export async function fetchRecentFilings(cik: string): Promise<FetchedFiling[]> {
  const data = await edgarGetJson<SubmissionsResponse>(
    `https://data.sec.gov/submissions/CIK${cik}.json`
  );

  const { recent } = data.filings;
  const results: FetchedFiling[] = [];

  for (let i = 0; i < recent.form.length; i++) {
    const formType = RELEVANT_FORMS[recent.form[i]];
    if (!formType) continue;

    const periodOfReport = recent.reportDate[i];
    const { year, period } = inferFiscalPeriod(periodOfReport, recent.form[i]);
    const accession = recent.accessionNumber[i];
    const accessionNoDashes = accession.replace(/-/g, "");

    results.push({
      accessionNumber: accession,
      formType,
      filingDate: recent.filingDate[i],
      periodOfReport,
      fiscalYear: year,
      fiscalPeriod: period,
      primaryDocumentUrl: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionNoDashes}/${recent.primaryDocument[i]}`,
    });
  }

  return results;
}
