import { describe, expect, it } from "vitest";

import type { ValidationResult } from "./validation.js";
import { recommendationInternalsForTest } from "./recommendation.js";
import type { MarketAdjustmentFactor } from "./marketAdjustment.js";

const cleanValidation: ValidationResult = {
  summary: {
    totalRows: 1,
    validRows: 1,
    errorRows: 0,
    warningRows: 0
  },
  errors: [],
  warnings: []
};

describe("recommendation golden dataset", () => {
  it("golden F1-F6: feature extraction remains deterministic", () => {
  const row = {
    customerId: "CUST-GOLD-001",
    tenure_days: 365,
    monthsSinceLastDormancy: 10,
    accountStatusHistoryCount: 1,
    monthlyClosingBalances6M: "10000 11000 12000 13000 14000 15000",
    monthlyClosingBalances12M: "8000 8500 9000 9500 10000 10500 11000 11500 12000 12500 13000 13500",
    monthlyDepositAmounts12M: "1000 1200 1100 1150 1300 1250 1400 1500 1450 1550 1600 1700",
    installmentsDue: 20,
    installmentsOnTime: 18,
    maxDaysPastDue: 3,
    restructuringsCount: 0,
    repaidToDefaultedRatio: 3,
    debitToCreditRatio: 0.9,
    digitalTransactionsPct: 70,
    uniquePayeesPerMonth: 8,
    utilityPaymentPattern: "true",
    dailyBalances12M: "100 200 300 -50 -25 75 -10 80 90 120",
    monthlyInflow: 20000,
    monthlyOutflow: 12000,
    requestedLoanAmount: 50000
  };

  const { features, notes } = recommendationInternalsForTest.buildModelFeatures(row);

    expect(features.tenureDays).toBe(365);
    expect(Math.round(features.avgBalance6m)).toBe(12500);
    expect(Math.round(features.balanceTrendSlope12m)).toBe(500);
    expect(features.depositCv).toBeGreaterThan(0);
    expect(features.depositCv).toBeLessThan(1);
    expect(Math.round(features.repaymentRatePct)).toBe(90);
    expect(features.unauthorizedOverdraftDays12m).toBe(3);
    expect(features.unauthorizedOverdraftTimes).toBe(2);
    expect(features.maxOverdraftDepth).toBe(50);
    expect(notes.includes("F6 derived from dailyBalances12M; approved OD facility assumed unavailable.")).toBe(true);
  });

  it("golden F4/F5 policy rules: insufficient deposits and no prior loans", () => {
  const row = {
    customerId: "CUST-GOLD-002",
    accountOpeningDate: "2026-01-01",
    monthlyDepositAmounts12M: "1000 0 0 0 0 0 0 0 0 0 0 0",
    hasPriorLoans: "false",
    monthlyInflow: 10000,
    monthlyOutflow: 6000,
    requestedLoanAmount: 30000
  };

  const { features, notes } = recommendationInternalsForTest.buildModelFeatures(row);
  const scored = recommendationInternalsForTest.calculateScoreFromFeatures(features, cleanValidation, notes);

    expect(features.depositCv).toBe(999);
    expect(features.hasPriorLoans).toBe(false);
    expect(
      notes.includes("F4 rule applied: fewer than 3 active deposit months; deposit_cv set to 999.")
    ).toBe(true);
    expect(
      scored.explanation.policyNotes.includes("No prior loans found; repayment history group set to neutral score 500.")
    ).toBe(true);
  });

  it("golden score: weighted score is reproducible for baseline dataset", () => {
  const row = {
    customerId: "CUST-GOLD-003",
    tenure_days: 730,
    monthsSinceLastDormancy: 12,
    accountStatusHistoryCount: 2,
    monthlyClosingBalances6M: "15000 15500 16000 16500 17000 17500",
    monthlyClosingBalances12M: "12000 12500 13000 13500 14000 14500 15000 15500 16000 16500 17000 17500",
    monthlyDepositAmounts12M: "2000 2100 2200 2300 2200 2400 2500 2600 2550 2650 2750 2850",
    installmentsDue: 24,
    installmentsOnTime: 24,
    maxDaysPastDue: 0,
    restructuringsCount: 0,
    repaidToDefaultedRatio: 5,
    debitToCreditRatio: 0.85,
    digitalTransactionsPct: 75,
    uniquePayeesPerMonth: 10,
    utilityPaymentPattern: "true",
    unauthorizedOverdraftTimes: 0,
    unauthorizedOverdraftDays12M: 0,
    maxOverdraftDepth: 0,
    monthlyInflow: 25000,
    monthlyOutflow: 14000,
    requestedLoanAmount: 60000
  };

  const { features, notes } = recommendationInternalsForTest.buildModelFeatures(row);
  const scored = recommendationInternalsForTest.calculateScoreFromFeatures(features, cleanValidation, notes);

    expect(scored.score).toBe(440);
  });

  it("applies inflation/devaluation recalibration and exposes traceability", () => {
    const row = {
      customerId: "CUST-GOLD-004",
      tenure_days: 730,
      monthlyClosingBalances6M: "15000 15500 16000 16500 17000 17500",
      monthlyClosingBalances12M: "12000 12500 13000 13500 14000 14500 15000 15500 16000 16500 17000 17500",
      monthlyDepositAmounts12M: "2000 2100 2200 2300 2200 2400 2500 2600 2550 2650 2750 2850",
      installmentsDue: 24,
      installmentsOnTime: 24,
      monthlyInflow: 25000,
      monthlyOutflow: 14000,
      requestedLoanAmount: 60000
    };

    const marketAdjustment: MarketAdjustmentFactor = {
      factor: 0.92,
      inflationPercent: 18,
      devaluationPercent: 8,
      effectiveFrom: "2026-01-01T00:00:00Z",
      effectiveTo: null,
      source: "in_memory_default"
    };

    const { features, notes } = recommendationInternalsForTest.buildModelFeatures(row);
    const scored = recommendationInternalsForTest.calculateScoreFromFeatures(
      features,
      cleanValidation,
      notes,
      marketAdjustment
    );

    expect(scored.explanation.marketAdjustment.factor).toBe(0.92);
    expect(scored.explanation.marketAdjustment.inflationPercent).toBe(18);
    expect(scored.explanation.marketAdjustment.devaluationPercent).toBe(8);
    expect(scored.explanation.marketAdjustment.rawScore).toBeGreaterThan(scored.explanation.marketAdjustment.adjustedScore);
    expect(scored.score).toBe(scored.explanation.marketAdjustment.adjustedScore);
  });
});
