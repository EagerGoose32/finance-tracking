import { edgarGetJson } from "./edgarClient";

interface XbrlUnitFact {
  end: string;
  start?: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
}

interface XbrlConceptData {
  label?: string;
  description?: string;
  units: Record<string, XbrlUnitFact[]>;
}

interface CompanyFactsResponse {
  cik: number;
  entityName: string;
  facts: Record<string, Record<string, XbrlConceptData>>;
}

export interface ExtractedFact {
  concept: string; // e.g. "us-gaap:Assets"
  taxonomy: string;
  unit: string;
  value: number;
  startDate: string | null; // null => instant fact
  endDate: string;
  formType: "10-K" | "10-Q";
}

export async function fetchCompanyFacts(cik: string): Promise<CompanyFactsResponse> {
  return edgarGetJson<CompanyFactsResponse>(
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`
  );
}

/**
 * Extracts every fact tied to a specific filing (by SEC accession number).
 * The companyfacts payload is organized by concept, not by filing, so this
 * scans all concepts/units and picks out entries whose `accn` matches.
 */
export function getFactsForAccession(
  companyFacts: CompanyFactsResponse,
  accessionNumber: string
): ExtractedFact[] {
  const results: ExtractedFact[] = [];

  for (const [taxonomy, concepts] of Object.entries(companyFacts.facts)) {
    for (const [conceptName, conceptData] of Object.entries(concepts)) {
      for (const [unit, entries] of Object.entries(conceptData.units)) {
        for (const entry of entries) {
          if (entry.accn !== accessionNumber) continue;
          if (entry.form !== "10-K" && entry.form !== "10-Q") continue;

          results.push({
            concept: `${taxonomy}:${conceptName}`,
            taxonomy,
            unit,
            value: entry.val,
            startDate: entry.start ?? null,
            endDate: entry.end,
            formType: entry.form,
          });
        }
      }
    }
  }

  return results;
}
