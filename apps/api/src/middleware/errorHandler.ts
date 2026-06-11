import type { NextFunction, Request, Response } from "express";

import { PolicyViolationError } from "../errors/policyViolation.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof PolicyViolationError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      details: err.details,
      traceId: crypto.randomUUID()
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Unexpected server error";

  res.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message,
    details: [],
    traceId: crypto.randomUUID()
  });
}
