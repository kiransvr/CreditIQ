import type { Pool } from "pg";

import { getDbPool, hasDatabaseConfig } from "../db/client.js";

export interface MarketAdjustmentFactor {
  factor: number;
  inflationPercent: number;
  devaluationPercent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: "database" | "in_memory_default";
}

interface InMemoryMarketAdjustmentRule {
  effectiveFrom: string;
  effectiveTo: string | null;
  inflationPercent: number;
  devaluationPercent: number;
  factor: number;
}

const DEFAULT_MARKET_ADJUSTMENT_HISTORY: InMemoryMarketAdjustmentRule[] = [
  {
    effectiveFrom: "2025-01-01",
    effectiveTo: "2025-12-31",
    inflationPercent: 14,
    devaluationPercent: 4,
    factor: 0.95
  },
  {
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    inflationPercent: 18,
    devaluationPercent: 8,
    factor: 0.92
  }
];

function resolveInMemoryRule(asOfDate: Date): MarketAdjustmentFactor {
  const asOf = asOfDate.toISOString();
  const rule = DEFAULT_MARKET_ADJUSTMENT_HISTORY
    .find((item) => item.effectiveFrom <= asOf && (item.effectiveTo === null || item.effectiveTo >= asOf))
    ?? DEFAULT_MARKET_ADJUSTMENT_HISTORY[DEFAULT_MARKET_ADJUSTMENT_HISTORY.length - 1]
    ?? {
      effectiveFrom: "1970-01-01",
      effectiveTo: null,
      inflationPercent: 0,
      devaluationPercent: 0,
      factor: 1
    };

  return {
    factor: rule.factor,
    inflationPercent: rule.inflationPercent,
    devaluationPercent: rule.devaluationPercent,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
    source: "in_memory_default"
  };
}

async function resolveDatabaseRule(pool: Pool, asOfDate: Date): Promise<MarketAdjustmentFactor | null> {
  const asOf = asOfDate.toISOString();

  const result = await pool.query<{
    factor: string;
    inflation_percent: string;
    devaluation_percent: string;
    effective_from: string;
    effective_to: string | null;
  }>(
    `SELECT factor::text,
            inflation_percent::text,
            devaluation_percent::text,
            effective_from::text,
            effective_to::text
     FROM score_market_adjustment_factors
     WHERE effective_from <= $1::timestamptz
       AND (effective_to IS NULL OR effective_to >= $1::timestamptz)
     ORDER BY effective_from DESC
     LIMIT 1`,
    [asOf]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    factor: Number.parseFloat(row.factor),
    inflationPercent: Number.parseFloat(row.inflation_percent),
    devaluationPercent: Number.parseFloat(row.devaluation_percent),
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    source: "database"
  };
}

export async function getActiveMarketAdjustment(asOfDate: Date = new Date()): Promise<MarketAdjustmentFactor> {
  if (!hasDatabaseConfig()) {
    return resolveInMemoryRule(asOfDate);
  }

  try {
    const resolved = await resolveDatabaseRule(getDbPool(), asOfDate);
    if (resolved) {
      return resolved;
    }
  } catch (error) {
    const pgError = error as { code?: string; message?: string };
    const code = pgError.code ?? "";
    const message = (pgError.message ?? "").toLowerCase();
    if (code !== "42P01" && !message.includes("score_market_adjustment_factors")) {
      throw error;
    }
  }

  return resolveInMemoryRule(asOfDate);
}

export const marketAdjustmentInternalsForTest = {
  resolveInMemoryRule
};
