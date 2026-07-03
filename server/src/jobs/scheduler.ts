import cron from "node-cron";
import { pollWatchlist } from "../ingestion/jobs/pollWatchlist";

// Every 6 hours — plenty for a watchlist of a handful to dozens of tickers
// polled against SEC EDGAR, which typically publishes filings once per quarter/year.
export function startScheduler() {
  cron.schedule("0 */6 * * *", () => {
    pollWatchlist().catch((err) => console.error("pollWatchlist failed:", err));
  });
}
