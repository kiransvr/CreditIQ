import type { BorrowerRow, ValidationResult } from "./validation.js";

export type RecommendationDecision = "proceed" | "lower_loan" | "manual_review" | "reject";

export interface RecommendationResult {
  decision: RecommendationDecision;
  suggestedAmount: number;
  reasons: string[];
}

function toNumber(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

export function generateRecommendation(rows: BorrowerRow[], validation: ValidationResult): RecommendationResult {
  const inflows: number[] = [];
  const outflows: number[] = [];
  const requestedAmounts: number[] = [];

  for (const row of rows) {
    const inflow = toNumber(row.monthlyInflow);
    const outflow = toNumber(row.monthlyOutflow);
    const requested = toNumber(row.requestedLoanAmount);

    if (inflow !== null) {
      inflows.push(inflow);
    }

    if (outflow !== null) {
      outflows.push(outflow);
    }

    if (requested !== null) {
      requestedAmounts.push(requested);
    }
  }

  const avgInflow = average(inflows);
  const avgOutflow = average(outflows);
  const avgRequested = average(requestedAmounts);
  const netCashflow = avgInflow - avgOutflow;
  const capacityBasedAmount = roundAmount(netCashflow * 10);

  const reasons: string[] = [];

  reasons.push(`Validated ${validation.summary.totalRows} rows with ${validation.summary.errorRows} error rows and ${validation.summary.warningRows} warning rows.`);
  reasons.push(`Estimated average net monthly cashflow is ${roundAmount(netCashflow)}.`);

  if (avgRequested > 0) {
    reasons.push(`Average requested loan amount is ${roundAmount(avgRequested)}.`);
  } else {
    reasons.push("Requested loan amount could not be estimated from uploaded data.");
  }

  if (validation.summary.errorRows > 0) {
    reasons.push("Mandatory fields are missing or invalid, so manager review is required.");
    return {
      decision: "manual_review",
      suggestedAmount: roundAmount(Math.min(Math.max(avgRequested, 0), Math.max(capacityBasedAmount, 0))),
      reasons: reasons.slice(0, 5)
    };
  }

  if (netCashflow <= 0) {
    reasons.push("Cashflow indicates weak repayment capacity.");
    return {
      decision: "reject",
      suggestedAmount: 0,
      reasons: reasons.slice(0, 5)
    };
  }

  if (avgRequested > capacityBasedAmount && capacityBasedAmount > 0) {
    reasons.push("Requested amount exceeds estimated repayment capacity; lower amount is advised.");
    return {
      decision: "lower_loan",
      suggestedAmount: capacityBasedAmount,
      reasons: reasons.slice(0, 5)
    };
  }

  if (validation.summary.warningRows > 0) {
    reasons.push("Warning signals are present; manual review is recommended before approval.");
    return {
      decision: "manual_review",
      suggestedAmount: roundAmount(Math.max(avgRequested, 0)),
      reasons: reasons.slice(0, 5)
    };
  }

  reasons.push("Repayment capacity and data quality are within acceptable range for normal processing.");
  return {
    decision: "proceed",
    suggestedAmount: roundAmount(Math.max(avgRequested, 0)),
    reasons: reasons.slice(0, 5)
  };
}
