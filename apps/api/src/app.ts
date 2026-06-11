import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { healthRouter } from "./routes/health.js";
import { uploadsRouter } from "./routes/uploads.js";
import auditRouter from "./routes/audit.js";
import { fairnessRouter } from "./routes/fairness.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use("/api/v1", healthRouter);
  app.use("/api/v1", uploadsRouter);
  app.use("/api/v1/audit", auditRouter);
  app.use("/api/v1/fairness", fairnessRouter);
  app.use(errorHandler);

  return app;
}
