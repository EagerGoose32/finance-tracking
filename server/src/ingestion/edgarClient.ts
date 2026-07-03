import Bottleneck from "bottleneck";

const EDGAR_USER_AGENT = process.env.EDGAR_USER_AGENT;

if (!EDGAR_USER_AGENT) {
  throw new Error(
    "EDGAR_USER_AGENT env var is required (SEC rejects requests without a descriptive User-Agent). " +
      "Set it to something like 'finance-tracking contact@example.com'."
  );
}

// SEC's documented safe rate limit is ~10 req/sec/IP; stay well under it.
const limiter = new Bottleneck({
  reservoir: 5,
  reservoirRefreshAmount: 5,
  reservoirRefreshInterval: 1000,
  maxConcurrent: 5,
});

const MAX_RETRIES = 4;

async function fetchWithBackoff(url: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": EDGAR_USER_AGENT as string,
      Accept: "application/json",
    },
  });

  if ((res.status === 429 || res.status === 403) && attempt < MAX_RETRIES) {
    const backoffMs = 500 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
    return fetchWithBackoff(url, attempt + 1);
  }

  if (!res.ok) {
    throw new Error(`EDGAR request failed: ${res.status} ${res.statusText} for ${url}`);
  }

  return res;
}

export async function edgarGetJson<T>(url: string): Promise<T> {
  return limiter.schedule(() => fetchWithBackoff(url)).then((res) => res.json() as Promise<T>);
}
