import { readFileSync } from "node:fs";

import { env } from "../config/env.js";

export interface ModelIntegrityStatus {
  ok: boolean;
  errorCode?: "CRITICAL_ERROR";
  message?: string;
}

export function checkModelIntegrity(): ModelIntegrityStatus {
  // If no explicit model file is configured, run in legacy/no-model mode.
  if (!env.modelFilePath) {
    return { ok: true };
  }

  try {
    const raw = readFileSync(env.modelFilePath, "utf-8");
    JSON.parse(raw);
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown model file read error";
    return {
      ok: false,
      errorCode: "CRITICAL_ERROR",
      message: `Model file is missing or corrupt: ${detail}`
    };
  }
}

export function assertModelIntegrityOrThrow(): void {
  const status = checkModelIntegrity();
  if (!status.ok) {
    throw new Error(status.message ?? "CRITICAL_ERROR: model integrity check failed");
  }
}
