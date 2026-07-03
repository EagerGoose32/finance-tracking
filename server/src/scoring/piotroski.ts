import { resolveConcept, type FactRow } from "./xbrlConceptMap";

export interface ScoreOutcome {
  scoreValue: number | null; // 0-9, null if too incomplete to compute
  riskLevel: "low" | "medium" | "high" | "incomplete";
  inputs: Record<string, unknown>;
}

function safeDiv(num: number | null, den: number | null): number | null {
  if (num === null || den === null || den === 0) return null;
  return num / den;
}

/**
 * Piotroski F-Score: 9 binary signals (1 point each) covering
 * profitability, leverage/liquidity, and operating efficiency.
 * Chosen first for MVP scoring because, unlike Altman Z, it needs no
 * market-cap input — every component comes from XBRL fundamentals.
 */
export function computePiotroskiFScore(facts: FactRow[], periodEnd: Date): ScoreOutcome {
  const netIncome = resolveConcept(facts, "NetIncome", periodEnd);
  const totalAssets = resolveConcept(facts, "Assets", periodEnd);
  const cfo = resolveConcept(facts, "CFO", periodEnd);
  const longTermDebt = resolveConcept(facts, "LongTermDebt", periodEnd);
  const currentAssets = resolveConcept(facts, "CurrentAssets", periodEnd);
  const currentLiabilities = resolveConcept(facts, "CurrentLiabilities", periodEnd);
  const shares = resolveConcept(facts, "CommonStockShares", periodEnd);
  const revenues = resolveConcept(facts, "Revenues", periodEnd);
  const cogs = resolveConcept(facts, "CostOfGoodsSold", periodEnd);

  const roaCurrent = safeDiv(netIncome.current, totalAssets.current);
  const roaPrior = safeDiv(netIncome.prior, totalAssets.prior);
  const currentRatioCurrent = safeDiv(currentAssets.current, currentLiabilities.current);
  const currentRatioPrior = safeDiv(currentAssets.prior, currentLiabilities.prior);
  const leverageCurrent = safeDiv(longTermDebt.current, totalAssets.current);
  const leveragePrior = safeDiv(longTermDebt.prior, totalAssets.prior);
  const grossMarginCurrent = safeDiv(
    revenues.current !== null && cogs.current !== null ? revenues.current - cogs.current : null,
    revenues.current
  );
  const grossMarginPrior = safeDiv(
    revenues.prior !== null && cogs.prior !== null ? revenues.prior - cogs.prior : null,
    revenues.prior
  );
  const assetTurnoverCurrent = safeDiv(revenues.current, totalAssets.current);
  const assetTurnoverPrior = safeDiv(revenues.prior, totalAssets.prior);

  const signals: Record<string, boolean | null> = {
    positiveROA: netIncome.current !== null && totalAssets.current !== null ? netIncome.current > 0 : null,
    positiveCFO: cfo.current !== null ? cfo.current > 0 : null,
    improvingROA: roaCurrent !== null && roaPrior !== null ? roaCurrent > roaPrior : null,
    cfoExceedsNetIncome:
      cfo.current !== null && netIncome.current !== null ? cfo.current > netIncome.current : null,
    decreasingLeverage:
      leverageCurrent !== null && leveragePrior !== null ? leverageCurrent < leveragePrior : null,
    improvingCurrentRatio:
      currentRatioCurrent !== null && currentRatioPrior !== null
        ? currentRatioCurrent > currentRatioPrior
        : null,
    noNewShares: shares.current !== null && shares.prior !== null ? shares.current <= shares.prior : null,
    improvingGrossMargin:
      grossMarginCurrent !== null && grossMarginPrior !== null
        ? grossMarginCurrent > grossMarginPrior
        : null,
    improvingAssetTurnover:
      assetTurnoverCurrent !== null && assetTurnoverPrior !== null
        ? assetTurnoverCurrent > assetTurnoverPrior
        : null,
  };

  const resolvedSignals = Object.values(signals).filter((s) => s !== null) as boolean[];
  const unresolvedCount = Object.values(signals).length - resolvedSignals.length;

  const inputs = {
    signals,
    tagsUsed: {
      netIncome: netIncome.tagUsed,
      totalAssets: totalAssets.tagUsed,
      cfo: cfo.tagUsed,
      longTermDebt: longTermDebt.tagUsed,
      currentAssets: currentAssets.tagUsed,
      currentLiabilities: currentLiabilities.tagUsed,
      shares: shares.tagUsed,
      revenues: revenues.tagUsed,
      cogs: cogs.tagUsed,
    },
    unresolvedSignalCount: unresolvedCount,
  };

  // If more than 2 of 9 signals can't be resolved, the score would be
  // misleadingly low rather than genuinely reflect risk — mark incomplete
  // instead of silently under-scoring.
  if (unresolvedCount > 2) {
    return { scoreValue: null, riskLevel: "incomplete", inputs };
  }

  const scoreValue = resolvedSignals.filter(Boolean).length;
  const riskLevel = scoreValue <= 3 ? "high" : scoreValue <= 6 ? "medium" : "low";

  return { scoreValue, riskLevel, inputs };
}
