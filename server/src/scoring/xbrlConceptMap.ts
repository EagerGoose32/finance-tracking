/**
 * SEC XBRL tag names for the same accounting concept vary across companies
 * and taxonomy years (e.g. revenue may be tagged Revenues,
 * RevenueFromContractWithCustomerExcludingAssessedTax, or SalesRevenueNet
 * depending on when/how a company adopted ASC 606). Each canonical concept
 * below lists candidate us-gaap tags in priority order; the first one with
 * data for a given period wins.
 */
export type CanonicalConcept =
  | "Assets"
  | "CurrentAssets"
  | "CurrentLiabilities"
  | "TotalLiabilities"
  | "Revenues"
  | "CostOfGoodsSold"
  | "SGA"
  | "NetIncome"
  | "CFO"
  | "Receivables"
  | "PPE"
  | "Depreciation"
  | "LongTermDebt"
  | "RetainedEarnings"
  | "EBIT"
  | "CommonStockShares";

// true => instant fact (balance-sheet, single date); false => duration fact (income/cash-flow, start->end range)
export const CONCEPT_IS_INSTANT: Record<CanonicalConcept, boolean> = {
  Assets: true,
  CurrentAssets: true,
  CurrentLiabilities: true,
  TotalLiabilities: true,
  Revenues: false,
  CostOfGoodsSold: false,
  SGA: false,
  NetIncome: false,
  CFO: false,
  Receivables: true,
  PPE: true,
  Depreciation: false,
  LongTermDebt: true,
  RetainedEarnings: true,
  EBIT: false,
  CommonStockShares: true,
};

export const CONCEPT_TAG_CANDIDATES: Record<CanonicalConcept, string[]> = {
  Assets: ["us-gaap:Assets"],
  CurrentAssets: ["us-gaap:AssetsCurrent"],
  CurrentLiabilities: ["us-gaap:LiabilitiesCurrent"],
  TotalLiabilities: ["us-gaap:Liabilities"],
  Revenues: [
    "us-gaap:Revenues",
    "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax",
    "us-gaap:RevenueFromContractWithCustomerIncludingAssessedTax",
    "us-gaap:SalesRevenueNet",
  ],
  CostOfGoodsSold: [
    "us-gaap:CostOfGoodsAndServicesSold",
    "us-gaap:CostOfRevenue",
    "us-gaap:CostOfGoodsSold",
  ],
  SGA: ["us-gaap:SellingGeneralAndAdministrativeExpense"],
  NetIncome: ["us-gaap:NetIncomeLoss", "us-gaap:ProfitLoss"],
  CFO: [
    "us-gaap:NetCashProvidedByUsedInOperatingActivities",
    "us-gaap:NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
  ],
  Receivables: ["us-gaap:ReceivablesNetCurrent", "us-gaap:AccountsReceivableNetCurrent"],
  PPE: ["us-gaap:PropertyPlantAndEquipmentNet"],
  Depreciation: [
    "us-gaap:DepreciationDepletionAndAmortization",
    "us-gaap:DepreciationAmortizationAndAccretionNet",
    "us-gaap:Depreciation",
  ],
  LongTermDebt: ["us-gaap:LongTermDebtNoncurrent", "us-gaap:LongTermDebt"],
  RetainedEarnings: ["us-gaap:RetainedEarningsAccumulatedDeficit"],
  EBIT: ["us-gaap:OperatingIncomeLoss"],
  CommonStockShares: [
    "us-gaap:CommonStockSharesOutstanding",
    "us-gaap:CommonStockSharesIssued",
  ],
};

export interface FactRow {
  concept: string; // "us-gaap:Assets"
  value: number;
  startDate: string | null;
  endDate: string;
}

export interface ResolvedConcept {
  current: number | null;
  prior: number | null;
  tagUsed: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MATCH_TOLERANCE_DAYS = 12; // allow for 52/53-week fiscal calendars

function withinTolerance(a: Date, b: Date, days: number): boolean {
  return Math.abs(a.getTime() - b.getTime()) <= days * DAY_MS;
}

function oneYearBefore(date: Date): Date {
  const d = new Date(date);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d;
}

/**
 * Picks the best-matching current/prior period values for a canonical
 * concept out of all facts reported within a single filing (a 10-K/10-Q
 * includes both the current period and comparative prior-period figures).
 */
export function resolveConcept(
  facts: FactRow[],
  canonicalConcept: CanonicalConcept,
  periodEnd: Date
): ResolvedConcept {
  const isInstant = CONCEPT_IS_INSTANT[canonicalConcept];
  const candidates = CONCEPT_TAG_CANDIDATES[canonicalConcept];
  const priorPeriodEnd = oneYearBefore(periodEnd);

  for (const tag of candidates) {
    const matches = facts.filter((f) => f.concept === tag);
    if (matches.length === 0) continue;

    const relevant = matches.filter((f) => {
      if (isInstant) return true;
      // duration fact: require roughly a 1-year span (annual) or ~3-month span (quarterly)
      if (!f.startDate) return false;
      const spanDays =
        (new Date(f.endDate).getTime() - new Date(f.startDate).getTime()) / DAY_MS;
      return spanDays > 25; // excludes stray very-short-period facts
    });

    const current = relevant.find((f) => withinTolerance(new Date(f.endDate), periodEnd, MATCH_TOLERANCE_DAYS));
    const prior = relevant.find((f) =>
      withinTolerance(new Date(f.endDate), priorPeriodEnd, MATCH_TOLERANCE_DAYS)
    );

    if (current || prior) {
      return {
        current: current?.value ?? null,
        prior: prior?.value ?? null,
        tagUsed: tag,
      };
    }
  }

  return { current: null, prior: null, tagUsed: null };
}
