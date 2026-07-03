import type { XbrlFactSnapshot } from "@prisma/client";

export interface DiffLine {
  concept: string;
  priorValue: number | null;
  newValue: number | null;
  deltaAbs: number | null;
  deltaPct: number | null;
  materialityFlag: boolean;
}

const MATERIALITY_THRESHOLD_PCT = 0.12; // 12% change flagged as material

/**
 * Compares XBRL facts between two filings of the SAME form_type
 * (10-K vs prior 10-K, 10-Q vs prior 10-Q) to avoid comparing
 * across misaligned fiscal periods.
 */
export function diffFilings(
  newFacts: XbrlFactSnapshot[],
  priorFacts: XbrlFactSnapshot[]
): DiffLine[] {
  const priorByConcept = new Map<string, number>();
  for (const fact of priorFacts) {
    priorByConcept.set(fact.concept, fact.value);
  }

  const newByConcept = new Map<string, number>();
  for (const fact of newFacts) {
    newByConcept.set(fact.concept, fact.value);
  }

  const allConcepts = new Set([...priorByConcept.keys(), ...newByConcept.keys()]);
  const lines: DiffLine[] = [];

  for (const concept of allConcepts) {
    const priorValue = priorByConcept.get(concept) ?? null;
    const newValue = newByConcept.get(concept) ?? null;

    if (priorValue === null || newValue === null) {
      lines.push({ concept, priorValue, newValue, deltaAbs: null, deltaPct: null, materialityFlag: false });
      continue;
    }

    const deltaAbs = newValue - priorValue;
    const deltaPct = priorValue !== 0 ? deltaAbs / Math.abs(priorValue) : null;
    const materialityFlag = deltaPct !== null && Math.abs(deltaPct) >= MATERIALITY_THRESHOLD_PCT;

    lines.push({ concept, priorValue, newValue, deltaAbs, deltaPct, materialityFlag });
  }

  return lines.sort((a, b) => {
    if (a.materialityFlag !== b.materialityFlag) return a.materialityFlag ? -1 : 1;
    return Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0);
  });
}
