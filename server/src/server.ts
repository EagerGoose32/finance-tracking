import express from "express";
import type { NextFunction, Request, Response } from "express";
import { apiKeyAuth } from "./api/middleware/apiKeyAuth";
import { watchlistRouter } from "./api/watchlist";
import { companiesRouter } from "./api/companies";
import { alertsRouter } from "./api/alerts";
import { devicesRouter } from "./api/devices";
import { ingestionRouter } from "./api/ingestion";
import { startScheduler } from "./jobs/scheduler";

const app = express();
app.use(express.json());
app.use(apiKeyAuth);

app.use("/api/watchlist", watchlistRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/ingestion", ingestionRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Must be registered last: catches errors forwarded by asyncHandler so a
// failed request returns 500 instead of crashing the process.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal_server_error" });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`finance-tracking server listening on :${port}`);
  startScheduler();
});
