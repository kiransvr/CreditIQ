import { Router } from "express";
import { checkModelIntegrity } from "../services/modelIntegrity.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  const modelStatus = checkModelIntegrity();
  if (!modelStatus.ok) {
    return res.status(503).json({
      status: "critical",
      service: "creditiq-api",
      error_code: modelStatus.errorCode,
      message: modelStatus.message,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    status: "ok",
    service: "creditiq-api",
    timestamp: new Date().toISOString()
  });
});
