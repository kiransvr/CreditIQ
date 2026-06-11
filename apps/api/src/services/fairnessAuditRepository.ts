import type { Pool } from "pg";

import { getDbPool, hasDatabaseConfig } from "../db/client.js";
import { PolicyViolationError } from "../errors/policyViolation.js";
import type { FairnessAuditResult } from "./fairnessAudit.js";

export interface FairnessAuditRecord {
  auditId: string;
  retrainingRunId: string;
  modelVersion: string;
  thresholdPercent: number;
  overallStatus: "pass" | "fail";
  reweightingRequired: boolean;
  result: FairnessAuditResult;
  createdAt: string;
}

interface FairnessAuditRepository {
  create(result: FairnessAuditResult): Promise<FairnessAuditRecord>;
  list(limit: number): Promise<FairnessAuditRecord[]>;
}

class InMemoryFairnessAuditRepository implements FairnessAuditRepository {
  private readonly records: FairnessAuditRecord[] = [];

  async create(result: FairnessAuditResult): Promise<FairnessAuditRecord> {
    const record: FairnessAuditRecord = {
      auditId: crypto.randomUUID(),
      retrainingRunId: result.retrainingRunId,
      modelVersion: result.modelVersion,
      thresholdPercent: result.thresholdPercent,
      overallStatus: result.overallStatus,
      reweightingRequired: result.reweightingRequired,
      result,
      createdAt: new Date().toISOString()
    };

    this.records.unshift(record);
    return record;
  }

  async list(limit: number): Promise<FairnessAuditRecord[]> {
    return this.records.slice(0, limit);
  }
}

class PostgresFairnessAuditRepository implements FairnessAuditRepository {
  constructor(private readonly pool: Pool) {}

  async create(result: FairnessAuditResult): Promise<FairnessAuditRecord> {
    try {
      const inserted = await this.pool.query<{
        id: string;
        retraining_run_id: string;
        model_version: string;
        threshold_percent: string;
        overall_status: "pass" | "fail";
        reweighting_required: boolean;
        result_json: FairnessAuditResult;
        created_at: string;
      }>(
        `INSERT INTO fairness_audit (
           id,
           retraining_run_id,
           model_version,
           threshold_percent,
           overall_status,
           reweighting_required,
           result_json
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         RETURNING id,
                   retraining_run_id,
                   model_version,
                   threshold_percent::text,
                   overall_status,
                   reweighting_required,
                   result_json,
                   created_at`,
        [
          crypto.randomUUID(),
          result.retrainingRunId,
          result.modelVersion,
          result.thresholdPercent,
          result.overallStatus,
          result.reweightingRequired,
          JSON.stringify(result)
        ]
      );

      const row = inserted.rows[0];
      if (!row) {
        throw new Error("Failed to persist fairness audit record");
      }

      return {
        auditId: row.id,
        retrainingRunId: row.retraining_run_id,
        modelVersion: row.model_version,
        thresholdPercent: Number.parseFloat(row.threshold_percent),
        overallStatus: row.overall_status,
        reweightingRequired: row.reweighting_required,
        result: row.result_json,
        createdAt: new Date(row.created_at).toISOString()
      };
    } catch (error) {
      const pgError = error as { code?: string; message?: string };
      const code = pgError.code ?? "";
      const message = (pgError.message ?? "").toLowerCase();
      if (code === "42P01" || message.includes("fairness_audit")) {
        throw new PolicyViolationError(
          "FAIRNESS_AUDIT_SCHEMA_MISSING",
          "FAIRNESS_AUDIT table is missing. Apply migration 007 before running fairness audits.",
          500,
          []
        );
      }

      throw error;
    }
  }

  async list(limit: number): Promise<FairnessAuditRecord[]> {
    try {
      const rows = await this.pool.query<{
        id: string;
        retraining_run_id: string;
        model_version: string;
        threshold_percent: string;
        overall_status: "pass" | "fail";
        reweighting_required: boolean;
        result_json: FairnessAuditResult;
        created_at: string;
      }>(
        `SELECT id,
                retraining_run_id,
                model_version,
                threshold_percent::text,
                overall_status,
                reweighting_required,
                result_json,
                created_at
         FROM fairness_audit
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return rows.rows.map((row) => ({
        auditId: row.id,
        retrainingRunId: row.retraining_run_id,
        modelVersion: row.model_version,
        thresholdPercent: Number.parseFloat(row.threshold_percent),
        overallStatus: row.overall_status,
        reweightingRequired: row.reweighting_required,
        result: row.result_json,
        createdAt: new Date(row.created_at).toISOString()
      }));
    } catch (error) {
      const pgError = error as { code?: string; message?: string };
      const code = pgError.code ?? "";
      const message = (pgError.message ?? "").toLowerCase();
      if (code === "42P01" || message.includes("fairness_audit")) {
        return [];
      }

      throw error;
    }
  }
}

let repository: FairnessAuditRepository | null = null;

export function getFairnessAuditRepository(): FairnessAuditRepository {
  if (!repository) {
    repository = hasDatabaseConfig()
      ? new PostgresFairnessAuditRepository(getDbPool())
      : new InMemoryFairnessAuditRepository();
  }

  return repository;
}
