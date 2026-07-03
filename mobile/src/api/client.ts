import type {
  Alert,
  Company,
  Filing,
  FilingDiffLine,
  RedFlagScore,
  WatchlistEntry,
} from "@finance-tracking/shared-types";

// Point this at your server's LAN/tunnel address during development
// (e.g. via `expo start` + a tunnel, or your machine's IP on the same network).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? "dev-local-api-key";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText} (${path})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getWatchlist: () => request<WatchlistEntry[]>("/api/watchlist"),
  addToWatchlist: (ticker: string) =>
    request<{ company: Company }>("/api/watchlist", {
      method: "POST",
      body: JSON.stringify({ ticker }),
    }),
  removeFromWatchlist: (companyId: string) =>
    request<void>(`/api/watchlist/${companyId}`, { method: "DELETE" }),

  getCompany: (companyId: string) =>
    request<Company & { filings: Filing[]; scores: RedFlagScore[] }>(
      `/api/companies/${companyId}`
    ),
  getCompanyScores: (companyId: string, scoreType?: string) =>
    request<RedFlagScore[]>(
      `/api/companies/${companyId}/scores${scoreType ? `?type=${scoreType}` : ""}`
    ),
  getCompanyFilings: (companyId: string) =>
    request<Filing[]>(`/api/companies/${companyId}/filings`),
  getFilingDiff: (companyId: string, filingId: string) =>
    request<{ newFiling: Filing; priorFiling: Filing | null; diffLines: FilingDiffLine[] }>(
      `/api/companies/${companyId}/filings/${filingId}/diff`
    ),

  getAlerts: (unreadOnly = false) =>
    request<Alert[]>(`/api/alerts${unreadOnly ? "?unread=true" : ""}`),
  markAlertRead: (alertId: string) =>
    request<Alert>(`/api/alerts/${alertId}/read`, { method: "POST" }),

  registerDevice: (token: string, platform: "ios" | "android") =>
    request<void>("/api/devices", { method: "POST", body: JSON.stringify({ token, platform }) }),
};
