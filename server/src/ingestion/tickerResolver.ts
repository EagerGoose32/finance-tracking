import { edgarGetJson } from "./edgarClient";

interface CompanyTickersEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

type CompanyTickersResponse = Record<string, CompanyTickersEntry>;

let cache: { fetchedAt: number; byTicker: Map<string, CompanyTickersEntry> } | null = null;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // refresh weekly

async function loadTickerMap(): Promise<Map<string, CompanyTickersEntry>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.byTicker;
  }

  const data = await edgarGetJson<CompanyTickersResponse>(
    "https://www.sec.gov/files/company_tickers.json"
  );

  const byTicker = new Map<string, CompanyTickersEntry>();
  for (const entry of Object.values(data)) {
    byTicker.set(entry.ticker.toUpperCase(), entry);
  }

  cache = { fetchedAt: Date.now(), byTicker };
  return byTicker;
}

export function padCik(cik: number | string): string {
  return String(cik).padStart(10, "0");
}

export interface ResolvedCompany {
  cik: string;
  ticker: string;
  name: string;
}

export async function resolveTicker(ticker: string): Promise<ResolvedCompany | null> {
  const map = await loadTickerMap();
  const entry = map.get(ticker.toUpperCase());
  if (!entry) return null;

  return {
    cik: padCik(entry.cik_str),
    ticker: entry.ticker.toUpperCase(),
    name: entry.title,
  };
}
