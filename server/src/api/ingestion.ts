import { Router } from "express";
import { pollWatchlist } from "../ingestion/jobs/pollWatchlist";

export const ingestionRouter = Router();

// Manual trigger for demos/testing — protected by the same API key middleware as everything else.
ingestionRouter.post("/run", async (_req, res) => {
  pollWatchlist()
    .then(() => console.log("Manual ingestion run completed"))
    .catch((err) => console.error("Manual ingestion run failed:", err));

  res.status(202).json({ status: "started" });
});
