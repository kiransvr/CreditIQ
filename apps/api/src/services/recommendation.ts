import type { BorrowerRow, ValidationResult } from "./validation.js";
import { getActiveMarketAdjustment, type MarketAdjustmentFactor } from "./marketAdjustment.js";

export type RecommendationDecision = "proceed" | "lower_loan" | "manual_review" | "reject";
export type RiskCategory = "low" | "medium" | "high" | "very_high";

export interface ScoreComponent {
  key: string;
  label: string;
  impact: number;
  detail: string;
}

export interface RecommendationExplanation {
  baseScore: number;
  components: ScoreComponent[];
  policyNotes: string[];
  weightedSignals: Array<{
    key: string;
    label: string;
    weight: number;
    value: number;
    impact: number;
  }>;
  rationaleCategories: Array<{
    category: string;
    rationale: string;
    impact: number;
  }>;
  scoreTrend: Array<{ label: string; value: number }>;
  marketAdjustment: {
    source: "database" | "in_memory_default";
    effectiveFrom: string;
    effectiveTo: string | null;
    inflationPercent: number;
    devaluationPercent: number;
    factor: number;
    rawScore: number;
    adjustedScore: number;
  };
}

export interface RecommendationResult {
  decision: RecommendationDecision;
  suggestedAmount: number;
  score: number;
  riskCategory: RiskCategory;
  reasons: string[];
  explanation: RecommendationExplanation;
  customerScores: CustomerScore[];
}

export interface CustomerScore {
  row: number;
  customerId: string;
  customerName?: string;
  score: number;
  riskCategory: RiskCategory;
  confidence: number;
  manualReviewRequired: boolean;
  decision: RecommendationDecision;
  suggestedAmount: number;
  reasons: string[];
}

interface ModelFeatures {
  tenureDays: number;
  monthsSinceLastDormancy: number;
  statusHistoryCount: number;
  avgBalance6m: number;
  onTimeInstallments: number;
  totalInstallments: number;
  monthlyClosingBalances6m: number[];
  monthlyClosingBalances12m: number[];
  monthlyDepositTotals12m: number[];
  avgBalance12m: number;
  balanceTrendSlope12m: number;
  minBalance6m: number;
  positiveBalanceMonthsPct: number;
  creditsPerMonth12m: number;
  salaryCreditMonthsPct: number;
  maxDepositGapDays: number;
  depositCv: number;
  hasPriorLoans: boolean;
  repaymentRatePct: number;
  maxDaysPastDue: number;
  restructuringsCount: number;
  repaidToDefaultedRatio: number;
  debitToCreditRatio: number;
  digitalTxPct: number;
  uniquePayeesPerMonth: number;
  utilityPatternPresent: number;
  unauthorizedOverdraftTimes: number;
  unauthorizedOverdraftDays12m: number;
  maxOverdraftDepth: number;
  monthlyInflow: number;
  monthlyOutflow: number;
  requestedLoanAmount: number;
}

interface FeatureBuildResult {
  features: ModelFeatures;
  notes: string[];
}

interface GroupScores {
  accountStability: number;
  balanceBehaviour: number;
  depositRegularity: number;
  repaymentHistory: number;
  spendingPatterns: number;
  overdraftExposure: number;
}

const GROUP_WEIGHTS = {
  accountStability: 0.25,
  balanceBehaviour: 0.22,
  depositRegularity: 0.2,
  repaymentHistory: 0.18,
  spendingPatterns: 0.1,
  overdraftExposure: 0.05
} as const;

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

function parseBoolean(value: string | number | null | undefined): boolean | null {
  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "n", "0"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function roundAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function scoreFromThresholds(value: number, min: number, max: number): number {
  if (max <= min) {
    return 500;
  }

  const scaled = ((value - min) / (max - min)) * 1000;
  return Math.round(clamp(scaled, 0, 1000));
}

function inverseScoreFromThresholds(value: number, min: number, max: number): number {
  return 1000 - scoreFromThresholds(value, min, max);
}

function parseNumberArray(raw: string): number[] {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return [];
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => toNumber(item as string | number | null | undefined))
          .filter((item): item is number => item !== null);
      }
    } catch {
      return [];
    }
  }

  return trimmed
    .split(/[|;\s]+/)
    .map((item) => toNumber(item))
    .filter((item): item is number => item !== null);
}

function getNumberArrayValue(row: BorrowerRow, keys: string[]): number[] {
  for (const key of keys) {
    const raw = row[key];
    if (Array.isArray(raw)) {
      const parsed = raw
        .map((item) => toNumber(item as string | number | null | undefined))
        .filter((item): item is number => item !== null);
      if (parsed.length > 0) {
        return parsed;
      }
    }

    if (typeof raw === "string") {
      const parsed = parseNumberArray(raw);
      if (parsed.length > 0) {
        return parsed;
      }
    }
  }

  return [];
}

function normalizeMonthlyClosings(values: number[], required: number): number[] {
  const normalized = values.slice(0, required);
  if (normalized.length === 0) {
    return new Array(required).fill(0);
  }

  for (let i = 0; i < normalized.length; i += 1) {
    const current = normalized[i];
    if (current === undefined || !Number.isFinite(current)) {
      normalized[i] = i > 0 ? (normalized[i - 1] ?? 0) : 0;
    }
  }

  while (normalized.length < required) {
    normalized.push(normalized[normalized.length - 1] ?? 0);
  }

  return normalized;
}

function computeSlope(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const n = values.length;
  const xs = values.map((_, index) => index + 1);
  const meanX = average(xs);
  const meanY = average(values);

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    const x = xs[i] ?? 0;
    const y = values[i] ?? 0;
    const dx = x - meanX;
    numerator += dx * (y - meanY);
    denominator += dx * dx;
  }

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

function computeStdDev(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function getTextValue(row: BorrowerRow, keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return String(raw);
    }
  }

  return undefined;
}

function getNumberValue(row: BorrowerRow, keys: string[]): number | null {
  for (const key of keys) {
    const parsed = toNumber(row[key]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function getBooleanValue(row: BorrowerRow, keys: string[]): boolean | null {
  for (const key of keys) {
    const parsed = parseBoolean(row[key]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function deriveTenureDays(row: BorrowerRow): number {
  const explicit = getNumberValue(row, ["tenureDays", "accountTenureDays", "tenure_days"]);
  if (explicit !== null) {
    return Math.max(0, explicit);
  }

  const openDate = getTextValue(row, ["accountOpeningDate", "account_opening_date", "accountOpenDate"]);
  if (openDate) {
    const parsed = Date.parse(openDate);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24)));
    }
  }

  return 0;
}

function computeF1Tenure(row: BorrowerRow, notes: string[]): number {
  const tenureDays = deriveTenureDays(row);
  if (tenureDays < 180) {
    notes.push("F1 Insufficient Data: tenure_days is below 180 days.");
  }
  return tenureDays;
}

function computeF2AvgBalance6m(row: BorrowerRow, notes: string[]): { avgBalance6m: number; closings6m: number[] } {
  const closingsRaw = getNumberArrayValue(row, [
    "monthlyClosingBalances6M",
    "monthly_closing_balances_6m",
    "lastBalances6M"
  ]);

  if (closingsRaw.length > 0) {
    const closings6m = normalizeMonthlyClosings(closingsRaw, 6);
    return { avgBalance6m: average(closings6m), closings6m };
  }

  const fallback = getNumberValue(row, ["avgMonthlyClosingBalance6M", "avg_balance_6m", "averageBalance6m", "averageBalance"]) ?? 0;
  notes.push("F2 fallback: monthly closing balances (6M) not provided; used avg balance proxy field.");
  return { avgBalance6m: fallback, closings6m: new Array(6).fill(fallback) };
}

function computeF3BalanceSlope12m(row: BorrowerRow, notes: string[]): { slope: number; avgBalance12m: number; minBalance6m: number; positiveBalanceMonthsPct: number } {
  const closingsRaw = getNumberArrayValue(row, [
    "monthlyClosingBalances12M",
    "monthly_closing_balances_12m",
    "lastBalances12M"
  ]);

  if (closingsRaw.length > 0) {
    const closings12m = normalizeMonthlyClosings(closingsRaw, 12);
    const slope = computeSlope(closings12m);
    const minBalance6m = Math.min(...closings12m.slice(-6));
    const positiveMonths = closings12m.filter((value) => value > 0).length;
    return {
      slope,
      avgBalance12m: average(closings12m),
      minBalance6m,
      positiveBalanceMonthsPct: (positiveMonths / 12) * 100
    };
  }

  const slopeFallback = getNumberValue(row, ["balanceTrendSlope12M", "balance_trend_slope_12m"]) ?? 0;
  const avgBalance12m = getNumberValue(row, ["avgMonthlyClosingBalance12M", "avg_balance_12m", "averageBalance12m"]) ?? 0;
  const minBalance6m = getNumberValue(row, ["minBalanceLast6M", "min_balance_6m"]) ?? avgBalance12m;
  const positiveBalanceMonthsPct = getNumberValue(row, ["positiveBalanceMonthsPct", "positive_balance_months_pct"]) ?? 0;
  notes.push("F3 fallback: monthly 12M closings not provided; used balance trend proxy fields.");

  return {
    slope: slopeFallback,
    avgBalance12m,
    minBalance6m,
    positiveBalanceMonthsPct
  };
}

function computeF4DepositCv(row: BorrowerRow, notes: string[]): { depositCv: number; creditsPerMonth12m: number; salaryCreditMonthsPct: number; maxDepositGapDays: number } {
  const monthlyDeposits = getNumberArrayValue(row, [
    "monthlyDepositAmounts12M",
    "monthly_deposit_amounts_12m",
    "monthlyCredits12M"
  ]);

  let depositCv = 999;
  let creditsPerMonth12m = getNumberValue(row, ["creditTransactionsPerMonthAvg12M", "credits_per_month_12m"]) ?? 0;
  const salaryCreditMonthsPct = getNumberValue(row, ["salaryCreditMonthsPct", "salary_credit_months_pct"]) ?? 0;
  const maxDepositGapDays = getNumberValue(row, ["maxDepositGapDays", "max_deposit_gap_days"]) ?? 365;

  if (monthlyDeposits.length > 0) {
    const deposits12m = normalizeMonthlyClosings(monthlyDeposits, 12);
    const activeMonths = deposits12m.filter((amount) => amount > 0).length;
    const mean = average(deposits12m);
    const stdDev = computeStdDev(deposits12m);
    creditsPerMonth12m = activeMonths;

    if (activeMonths >= 3 && mean > 0) {
      depositCv = stdDev / mean;
    } else {
      depositCv = 999;
      notes.push("F4 rule applied: fewer than 3 active deposit months; deposit_cv set to 999.");
    }
  } else {
    const fallbackCv = getNumberValue(row, ["depositCoefficientOfVariation", "deposit_cv"]);
    if (fallbackCv !== null) {
      depositCv = fallbackCv;
      notes.push("F4 fallback: monthly deposit series missing; used provided deposit_cv value.");
    } else {
      notes.push("F4 rule applied: deposit series not provided; deposit_cv set to 999.");
    }
  }

  return {
    depositCv,
    creditsPerMonth12m,
    salaryCreditMonthsPct,
    maxDepositGapDays
  };
}

function computeF5Repayment(row: BorrowerRow, notes: string[]): { hasPriorLoans: boolean; repaymentRatePct: number; maxDaysPastDue: number; restructuringsCount: number; repaidToDefaultedRatio: number } {
  const installmentsDue = getNumberValue(row, ["installmentsDue", "installments_due"]);
  const installmentsOnTime = getNumberValue(row, ["installmentsOnTime", "installments_on_time"]);
  const priorLoansCount = getNumberValue(row, ["priorLoansCount", "prior_loans_count"]) ?? 0;
  const explicitPriorLoans = getBooleanValue(row, ["hasPriorLoans", "has_prior_loans"]);
  const hasPriorLoans = explicitPriorLoans ?? (priorLoansCount > 0);

  let repaymentRatePct = getNumberValue(row, ["repaymentRate", "onTimeRepaymentRate", "repayment_rate"]) ?? 0;
  if (installmentsDue !== null && installmentsOnTime !== null && installmentsDue > 0) {
    repaymentRatePct = (installmentsOnTime / installmentsDue) * 100;
  }

  if (!hasPriorLoans) {
    notes.push("F5 rule applied: no prior loans found; repayment group will use neutral score 500.");
  }

  return {
    hasPriorLoans,
    repaymentRatePct,
    maxDaysPastDue: getNumberValue(row, ["maxDaysPastDue", "max_days_past_due"]) ?? 0,
    restructuringsCount: getNumberValue(row, ["restructuringsCount", "restructurings_count"]) ?? 0,
    repaidToDefaultedRatio: getNumberValue(row, ["repaidToDefaultedRatio", "repaid_to_defaulted_ratio"]) ?? 1
  };
}

function computeF6OverdraftDays(row: BorrowerRow, notes: string[]): { unauthorizedOverdraftDays12m: number; unauthorizedOverdraftTimes: number; maxOverdraftDepth: number } {
  const explicitDays = getNumberValue(row, ["unauthorizedOverdraftDays12M", "unauthorized_overdraft_days_12m", "negativeBalanceDays12M", "negative_balance_days_12m"]);
  const explicitTimes = getNumberValue(row, ["unauthorizedOverdraftTimes", "unauthorized_overdraft_times", "negativeBalanceOccurrences12M"]);
  const explicitDepth = getNumberValue(row, ["maxOverdraftDepth", "max_overdraft_depth"]);

  if (explicitDays !== null || explicitTimes !== null || explicitDepth !== null) {
    return {
      unauthorizedOverdraftDays12m: explicitDays ?? 0,
      unauthorizedOverdraftTimes: explicitTimes ?? 0,
      maxOverdraftDepth: Math.abs(explicitDepth ?? 0)
    };
  }

  const dailyBalances = getNumberArrayValue(row, ["dailyBalances12M", "daily_balances_12m"]);
  if (dailyBalances.length > 0) {
    const unauthorizedOverdraftDays12m = dailyBalances.filter((value) => value < 0).length;
    const unauthorizedOverdraftTimes = dailyBalances.filter((value, idx) => {
      const previous = idx === 0 ? 0 : (dailyBalances[idx - 1] ?? 0);
      return value < 0 && previous >= 0;
    }).length;
    const maxOverdraftDepth = Math.abs(Math.min(...dailyBalances, 0));
    notes.push("F6 derived from dailyBalances12M; approved OD facility assumed unavailable.");
    return {
      unauthorizedOverdraftDays12m,
      unauthorizedOverdraftTimes,
      maxOverdraftDepth
    };
  }

  notes.push("F6 fallback: unauthorized overdraft daily series not provided; overdraft metrics defaulted.");
  return {
    unauthorizedOverdraftDays12m: 0,
    unauthorizedOverdraftTimes: 0,
    maxOverdraftDepth: 0
  };
}

function buildModelFeatures(row: BorrowerRow): FeatureBuildResult {
  const notes: string[] = [];
  const monthlyInflow = getNumberValue(row, ["monthlyInflow", "monthly_inflow"]) ?? 0;
  const monthlyOutflow = getNumberValue(row, ["monthlyOutflow", "monthly_outflow"]) ?? 0;
  const requestedLoanAmount = getNumberValue(row, ["requestedLoanAmount", "requested_loan_amount"]) ?? 0;

  const tenureDays = computeF1Tenure(row, notes);
  const f2 = computeF2AvgBalance6m(row, notes);
  const f3 = computeF3BalanceSlope12m(row, notes);
  const f4 = computeF4DepositCv(row, notes);
  const f5 = computeF5Repayment(row, notes);
  const f6 = computeF6OverdraftDays(row, notes);

  return {
    features: {
      tenureDays,
      monthsSinceLastDormancy: getNumberValue(row, ["monthsSinceLastDormancy", "months_since_last_dormancy"]) ?? 0,
      statusHistoryCount: getNumberValue(row, ["accountStatusHistoryCount", "account_status_history_count"]) ?? 0,
      avgBalance6m: f2.avgBalance6m,
      avgBalance12m: f3.avgBalance12m,
      balanceTrendSlope12m: f3.slope,
      minBalance6m: f3.minBalance6m,
      positiveBalanceMonthsPct: f3.positiveBalanceMonthsPct,
      creditsPerMonth12m: f4.creditsPerMonth12m,
      salaryCreditMonthsPct: f4.salaryCreditMonthsPct,
      maxDepositGapDays: f4.maxDepositGapDays,
      depositCv: f4.depositCv,
      hasPriorLoans: f5.hasPriorLoans,
      repaymentRatePct: f5.repaymentRatePct,
      maxDaysPastDue: f5.maxDaysPastDue,
      restructuringsCount: f5.restructuringsCount,
      repaidToDefaultedRatio: f5.repaidToDefaultedRatio,
      debitToCreditRatio: getNumberValue(row, ["debitToCreditRatio", "debit_to_credit_ratio"]) ?? 1,
      digitalTxPct: getNumberValue(row, ["digitalTransactionsPct", "digital_tx_pct"]) ?? 0,
      uniquePayeesPerMonth: getNumberValue(row, ["uniquePayeesPerMonth", "unique_payees_per_month"]) ?? 0,
      utilityPatternPresent: (getBooleanValue(row, ["utilityPaymentPattern", "utility_payment_pattern"]) ? 1 : 0),
      unauthorizedOverdraftTimes: f6.unauthorizedOverdraftTimes,
      unauthorizedOverdraftDays12m: f6.unauthorizedOverdraftDays12m,
      maxOverdraftDepth: f6.maxOverdraftDepth,
      monthlyInflow,
      monthlyOutflow,
      requestedLoanAmount,
      onTimeInstallments: getNumberValue(row, ["onTimeInstallments", "on_time_installments"]) ?? 0,
      totalInstallments: getNumberValue(row, ["totalInstallments", "total_installments"]) ?? 0,
      monthlyClosingBalances6m: normalizeMonthlyClosings(
        getNumberArrayValue(row, [
          "monthlyClosingBalances6M",
          "monthly_closing_balances_6m",
          "monthlyBalances6M"
        ]),
        6
      ),
      monthlyClosingBalances12m: normalizeMonthlyClosings(
        getNumberArrayValue(row, [
          "monthlyClosingBalances12M",
          "monthly_closing_balances_12m",
          "monthlyBalances12M"
        ]),
        12
      ),
      monthlyDepositTotals12m: getNumberArrayValue(row, [
        "monthlyDepositTotals12M",
        "monthly_deposit_totals_12m",
        "monthlyDeposits12M"
      ])
    },
    notes
  };
}

function computeGroupScores(features: ModelFeatures): { groupScores: GroupScores; notes: string[] } {
  const notes: string[] = [];
  const accountStability = Math.round(
    scoreFromThresholds(features.tenureDays, 180, 3650) * 0.6 +
    scoreFromThresholds(features.monthsSinceLastDormancy, 0, 36) * 0.25 +
    inverseScoreFromThresholds(features.statusHistoryCount, 0, 12) * 0.15
  );

  const balanceBehaviour = Math.round(
    scoreFromThresholds(features.avgBalance6m, -10000, 150000) * 0.35 +
    scoreFromThresholds(features.avgBalance12m, -10000, 150000) * 0.2 +
    scoreFromThresholds(features.balanceTrendSlope12m, -5000, 5000) * 0.2 +
    scoreFromThresholds(features.minBalance6m, -10000, 100000) * 0.15 +
    scoreFromThresholds(features.positiveBalanceMonthsPct, 0, 100) * 0.1
  );

  const normalizedCv = features.depositCv >= 999 ? 999 : features.depositCv;
  if (features.depositCv >= 999) {
    notes.push("Deposit CV set to 999 due to insufficient months with deposits.");
  }

  const depositRegularity = Math.round(
    scoreFromThresholds(features.creditsPerMonth12m, 0, 30) * 0.3 +
    scoreFromThresholds(features.salaryCreditMonthsPct, 0, 100) * 0.25 +
    inverseScoreFromThresholds(features.maxDepositGapDays, 0, 180) * 0.2 +
    inverseScoreFromThresholds(normalizedCv, 0, 3) * 0.25
  );

  const repaymentHistory = features.hasPriorLoans
    ? Math.round(
      scoreFromThresholds(features.repaymentRatePct, 0, 100) * 0.45 +
      inverseScoreFromThresholds(features.maxDaysPastDue, 0, 180) * 0.25 +
      inverseScoreFromThresholds(features.restructuringsCount, 0, 5) * 0.15 +
      scoreFromThresholds(features.repaidToDefaultedRatio, 0, 5) * 0.15
    )
    : 500;

  if (!features.hasPriorLoans) {
    notes.push("No prior loans found; repayment history group set to neutral score 500.");
  }

  const spendingPatterns = Math.round(
    inverseScoreFromThresholds(Math.abs(features.debitToCreditRatio - 1), 0, 2) * 0.4 +
    scoreFromThresholds(features.digitalTxPct, 0, 100) * 0.25 +
    scoreFromThresholds(features.uniquePayeesPerMonth, 0, 25) * 0.2 +
    scoreFromThresholds(features.utilityPatternPresent, 0, 1) * 0.15
  );

  const overdraftExposure = Math.round(
    inverseScoreFromThresholds(features.unauthorizedOverdraftTimes, 0, 24) * 0.35 +
    inverseScoreFromThresholds(features.unauthorizedOverdraftDays12m, 0, 365) * 0.45 +
    inverseScoreFromThresholds(features.maxOverdraftDepth, 0, 50000) * 0.2
  );

  return {
    groupScores: {
      accountStability,
      balanceBehaviour,
      depositRegularity,
      repaymentHistory,
      spendingPatterns,
      overdraftExposure
    },
    notes
  };
}

function toRiskCategory(score: number): RiskCategory {
  if (score >= 750) {
    return "low";
  }

  if (score >= 620) {
    return "medium";
  }

  if (score >= 450) {
    return "high";
  }

  return "very_high";
}

function calculateScoreFromFeatures(
  features: ModelFeatures,
  validation: ValidationResult,
  featureNotes: string[] = [],
  marketAdjustment: MarketAdjustmentFactor = {
    factor: 1,
    inflationPercent: 0,
    devaluationPercent: 0,
    effectiveFrom: "1970-01-01T00:00:00Z",
    effectiveTo: null,
    source: "in_memory_default"
  }
): { score: number; explanation: RecommendationExplanation } {
  const baseScore = 500;
  const { groupScores, notes } = computeGroupScores(features);

  const weightedRawScore =
    groupScores.accountStability * GROUP_WEIGHTS.accountStability +
    groupScores.balanceBehaviour * GROUP_WEIGHTS.balanceBehaviour +
    groupScores.depositRegularity * GROUP_WEIGHTS.depositRegularity +
    groupScores.repaymentHistory * GROUP_WEIGHTS.repaymentHistory +
    groupScores.spendingPatterns * GROUP_WEIGHTS.spendingPatterns +
    groupScores.overdraftExposure * GROUP_WEIGHTS.overdraftExposure;

  const qualityPenalty = validation.summary.errorRows * 80 + validation.summary.warningRows * 20;
  const rawScore = Math.round(clamp(weightedRawScore - qualityPenalty, 0, 1000));
  const adjustedScore = Math.round(clamp(rawScore * marketAdjustment.factor, 0, 1000));

  const components: ScoreComponent[] = [
    {
      key: "account_stability",
      label: "Account Stability",
      impact: Math.round(groupScores.accountStability * GROUP_WEIGHTS.accountStability),
      detail: `Tenure ${features.tenureDays} days; months since dormancy ${features.monthsSinceLastDormancy}.`
    },
    {
      key: "balance_behaviour",
      label: "Balance Behaviour",
      impact: Math.round(groupScores.balanceBehaviour * GROUP_WEIGHTS.balanceBehaviour),
      detail: `6M average balance ${Math.round(features.avgBalance6m)}; 12M trend slope ${Math.round(features.balanceTrendSlope12m)}.`
    },
    {
      key: "deposit_regularity",
      label: "Deposit Regularity",
      impact: Math.round(groupScores.depositRegularity * GROUP_WEIGHTS.depositRegularity),
      detail: `Deposit CV ${features.depositCv}; maximum deposit gap ${features.maxDepositGapDays} days.`
    },
    {
      key: "repayment_history",
      label: "Repayment History",
      impact: Math.round(groupScores.repaymentHistory * GROUP_WEIGHTS.repaymentHistory),
      detail: features.hasPriorLoans
        ? `On-time repayment rate ${features.repaymentRatePct}%; max DPD ${features.maxDaysPastDue}.`
        : "No prior loans; neutral score 500 applied."
    },
    {
      key: "spending_patterns",
      label: "Spending Patterns",
      impact: Math.round(groupScores.spendingPatterns * GROUP_WEIGHTS.spendingPatterns),
      detail: `Debit/credit ratio ${features.debitToCreditRatio}; digital transaction ratio ${features.digitalTxPct}%.`
    },
    {
      key: "overdraft_exposure",
      label: "Overdraft Exposure",
      impact: Math.round(groupScores.overdraftExposure * GROUP_WEIGHTS.overdraftExposure),
      detail: `Unauthorized overdraft days (12M) ${features.unauthorizedOverdraftDays12m}; max depth ${features.maxOverdraftDepth}.`
    },
    {
      key: "data_quality",
      label: "Data quality adjustment",
      impact: -qualityPenalty,
      detail: `${validation.summary.errorRows} error row(s) and ${validation.summary.warningRows} warning row(s).`
    },
    {
      key: "market_adjustment",
      label: "Market adjustment recalibration",
      impact: adjustedScore - rawScore,
      detail: `Factor ${marketAdjustment.factor.toFixed(4)} using inflation ${marketAdjustment.inflationPercent}% and devaluation ${marketAdjustment.devaluationPercent}%.`
    }
  ];

  const weightedSignals = [
    { key: "accountStability", label: "Account Stability", weight: GROUP_WEIGHTS.accountStability, value: groupScores.accountStability, impact: Math.round(groupScores.accountStability * GROUP_WEIGHTS.accountStability) },
    { key: "balanceBehaviour", label: "Balance Behaviour", weight: GROUP_WEIGHTS.balanceBehaviour, value: groupScores.balanceBehaviour, impact: Math.round(groupScores.balanceBehaviour * GROUP_WEIGHTS.balanceBehaviour) },
    { key: "depositRegularity", label: "Deposit Regularity", weight: GROUP_WEIGHTS.depositRegularity, value: groupScores.depositRegularity, impact: Math.round(groupScores.depositRegularity * GROUP_WEIGHTS.depositRegularity) },
    { key: "repaymentHistory", label: "Repayment History", weight: GROUP_WEIGHTS.repaymentHistory, value: groupScores.repaymentHistory, impact: Math.round(groupScores.repaymentHistory * GROUP_WEIGHTS.repaymentHistory) },
    { key: "spendingPatterns", label: "Spending Patterns", weight: GROUP_WEIGHTS.spendingPatterns, value: groupScores.spendingPatterns, impact: Math.round(groupScores.spendingPatterns * GROUP_WEIGHTS.spendingPatterns) },
    { key: "overdraftExposure", label: "Overdraft Exposure", weight: GROUP_WEIGHTS.overdraftExposure, value: groupScores.overdraftExposure, impact: Math.round(groupScores.overdraftExposure * GROUP_WEIGHTS.overdraftExposure) }
  ];

  const rationaleCategories = [
    { category: "feature_groups", rationale: "Six weighted feature groups applied as per model policy.", impact: Math.round(weightedRawScore - baseScore) },
    { category: "risk_signals", rationale: `Repayment rate ${features.repaymentRatePct}% and overdraft days ${features.unauthorizedOverdraftDays12m}.`, impact: 0 },
    { category: "data_quality", rationale: `Quality penalty ${qualityPenalty}.`, impact: -qualityPenalty }
  ];

  const scoreTrend = [
    { label: "Base Score", value: baseScore },
    { label: "Weighted Raw Score", value: Math.round(weightedRawScore) },
    { label: "Raw Score", value: rawScore },
    { label: "Adjusted Score", value: adjustedScore }
  ];

  return {
    score: adjustedScore,
    explanation: {
      baseScore,
      components,
      policyNotes: [
        ...featureNotes,
        ...notes,
        `Market recalibration factor ${marketAdjustment.factor.toFixed(4)} applied (${marketAdjustment.source}).`
      ],
      weightedSignals,
      rationaleCategories,
      scoreTrend,
      marketAdjustment: {
        source: marketAdjustment.source,
        effectiveFrom: marketAdjustment.effectiveFrom,
        effectiveTo: marketAdjustment.effectiveTo,
        inflationPercent: marketAdjustment.inflationPercent,
        devaluationPercent: marketAdjustment.devaluationPercent,
        factor: marketAdjustment.factor,
        rawScore,
        adjustedScore
      }
    }
  };
}

function buildCustomerScores(
  rows: BorrowerRow[],
  validation: ValidationResult,
  marketAdjustment: MarketAdjustmentFactor
): CustomerScore[] {
  const errorsByRow = new Map<number, number>();
  const warningsByRow = new Map<number, number>();

  for (const issue of validation.errors) {
    errorsByRow.set(issue.row, (errorsByRow.get(issue.row) ?? 0) + 1);
  }

  for (const issue of validation.warnings) {
    warningsByRow.set(issue.row, (warningsByRow.get(issue.row) ?? 0) + 1);
  }

  return rows.map((row, index) => {
    const rowNumber = index + 1;
    const rowErrors = errorsByRow.get(rowNumber) ?? 0;
    const rowWarnings = warningsByRow.get(rowNumber) ?? 0;

    const customerId = getTextValue(row, ["customerId", "customer_id"]) ?? `ROW-${rowNumber}`;
    const customerName = getTextValue(row, ["customerName", "name", "fullName"]);
    const builtFeatures = buildModelFeatures(row);
    const features = builtFeatures.features;
    const scored = calculateScoreFromFeatures({ ...features }, {
      summary: {
        totalRows: 1,
        validRows: rowErrors > 0 ? 0 : 1,
        errorRows: rowErrors > 0 ? 1 : 0,
        warningRows: rowWarnings > 0 ? 1 : 0
      },
      errors: [],
      warnings: []
    }, builtFeatures.notes, marketAdjustment);

    let score = scored.score;
    let confidence = 100;
    const reasons: string[] = [
      `Six-group weighted model produced score ${score}.`,
      `Account tenure is ${features.tenureDays} days.`,
      `Deposit CV is ${features.depositCv}.`,
      `Unauthorized overdraft days (12M): ${features.unauthorizedOverdraftDays12m}.`
    ];

    if (rowWarnings > 0) {
      score -= rowWarnings * 20;
      confidence -= rowWarnings * 8;
      reasons.push(`${rowWarnings} warning signal(s) found for this row.`);
    }

    if (rowErrors > 0) {
      score -= rowErrors * 50;
      confidence -= rowErrors * 15;
      reasons.push(`${rowErrors} blocking validation error(s) found for this row.`);
    }

    const finalScore = Math.round(clamp(score, 0, 1000));
    const finalConfidence = Math.round(clamp(confidence, 0, 100));
    const riskCategory = toRiskCategory(finalScore);
    const manualReviewRequired = rowErrors > 0 || rowWarnings > 0 || finalConfidence < 60;

    const netCashflow = features.monthlyInflow - features.monthlyOutflow;
    const capacityBasedAmount = roundAmount(Math.max(netCashflow, 0) * 10);
    const requested = features.requestedLoanAmount;

    let decision: RecommendationDecision = "proceed";
    if (rowErrors > 0 || manualReviewRequired) {
      decision = "manual_review";
    } else if (finalScore < 350 || netCashflow <= 0) {
      decision = "reject";
    } else if (capacityBasedAmount > 0 && requested > capacityBasedAmount) {
      decision = "lower_loan";
    }

    const suggestedAmount = decision === "reject"
      ? 0
      : decision === "lower_loan"
        ? capacityBasedAmount
        : roundAmount(Math.max(requested, capacityBasedAmount));

    return {
      row: rowNumber,
      customerId,
      customerName,
      score: finalScore,
      riskCategory,
      confidence: finalConfidence,
      manualReviewRequired,
      decision,
      suggestedAmount,
      reasons: reasons.slice(0, 5)
    };
  });
}

export async function generateRecommendation(rows: BorrowerRow[], validation: ValidationResult): Promise<RecommendationResult> {
  const marketAdjustment = await getActiveMarketAdjustment();

  const customerScores = buildCustomerScores(rows, validation, marketAdjustment);

  const inflows: number[] = [];
  const outflows: number[] = [];
  const requestedAmounts: number[] = [];
  const portfolioGroupScores: number[] = [];

  for (const row of rows) {
    const builtFeatures = buildModelFeatures(row);
    const features = builtFeatures.features;
    const inflow = features.monthlyInflow;
    const outflow = features.monthlyOutflow;
    const requested = features.requestedLoanAmount;
    const scoredRow = calculateScoreFromFeatures(features, validation, builtFeatures.notes, marketAdjustment);
    portfolioGroupScores.push(scoredRow.score);

    if (Number.isFinite(inflow)) {
      inflows.push(inflow);
    }

    if (Number.isFinite(outflow)) {
      outflows.push(outflow);
    }

    if (Number.isFinite(requested)) {
      requestedAmounts.push(requested);
    }
  }

  // Defensive: If no valid outflows, set avgOutflow to 0
  const avgInflow = inflows.length > 0 ? average(inflows) : 0;
  const avgOutflow = outflows.length > 0 ? average(outflows) : 0;
  const avgRequested = requestedAmounts.length > 0 ? average(requestedAmounts) : 0;
  const netCashflow = avgInflow - avgOutflow;
  const capacityBasedAmount = roundAmount(netCashflow * 10);
  const portfolioFeatureProxy: ModelFeatures = {
    tenureDays: 365,
    monthsSinceLastDormancy: 12,
    statusHistoryCount: 2,
    avgBalance6m: avgInflow,
    avgBalance12m: avgInflow,
    balanceTrendSlope12m: netCashflow,
    minBalance6m: avgInflow - avgOutflow,
    positiveBalanceMonthsPct: netCashflow > 0 ? 100 : 0,
    creditsPerMonth12m: 8,
    salaryCreditMonthsPct: 50,
    maxDepositGapDays: 30,
    depositCv: 1,
    hasPriorLoans: true,
    repaymentRatePct: 70,
    maxDaysPastDue: 15,
    restructuringsCount: 0,
    repaidToDefaultedRatio: 2,
    debitToCreditRatio: avgOutflow > 0 ? avgOutflow / Math.max(avgInflow, 1) : 1,
    digitalTxPct: 50,
    uniquePayeesPerMonth: 5,
    utilityPatternPresent: 1,
    unauthorizedOverdraftTimes: 0,
    unauthorizedOverdraftDays12m: 0,
    maxOverdraftDepth: 0,
    monthlyInflow: avgInflow,
    monthlyOutflow: avgOutflow,
    requestedLoanAmount: avgRequested,
    onTimeInstallments: 0,
    totalInstallments: 0,
    monthlyClosingBalances6m: new Array(6).fill(avgInflow - avgOutflow),
    monthlyClosingBalances12m: new Array(12).fill(avgInflow - avgOutflow),
    monthlyDepositTotals12m: new Array(12).fill(avgInflow)
  };
  const scored = calculateScoreFromFeatures(portfolioFeatureProxy, validation, [], marketAdjustment);
  const score = customerScores.length > 0
    ? Math.round(average(customerScores.map((item) => item.score)))
    : (portfolioGroupScores.length > 0 ? Math.round(average(portfolioGroupScores)) : scored.score);
  const riskCategory = toRiskCategory(score);
  const explanation: RecommendationExplanation = {
    ...scored.explanation,
    policyNotes: []
  };

  const reasons: string[] = [];

  reasons.push(`Validated ${validation.summary.totalRows} rows with ${validation.summary.errorRows} error rows and ${validation.summary.warningRows} warning rows.`);
  reasons.push(`Estimated average net monthly cashflow is ${roundAmount(netCashflow)}.`);
  reasons.push(`Calculated portfolio score is ${score} with ${riskCategory} risk category.`);
  reasons.push(`Individual customer scores generated for ${customerScores.length} row(s).`);

  if (avgRequested > 0) {
    reasons.push(`Average requested loan amount is ${roundAmount(avgRequested)}.`);
  } else {
    reasons.push("Requested loan amount could not be estimated from uploaded data.");
  }

  if (validation.summary.errorRows > 0) {
    reasons.push("Mandatory fields are missing or invalid, so manager review is required.");
    explanation.policyNotes.push("Policy rule: blocking validation errors force manual_review.");
    return {
      decision: "manual_review",
      suggestedAmount: roundAmount(Math.min(Math.max(avgRequested, 0), Math.max(capacityBasedAmount, 0))),
      score,
      riskCategory,
      reasons: reasons.slice(0, 5),
      explanation,
      customerScores
    };
  }

  if (netCashflow <= 0 || score < 420) {
    reasons.push("Cashflow indicates weak repayment capacity.");
    explanation.policyNotes.push("Policy rule: non-positive net cashflow or score < 420 leads to reject.");
    return {
      decision: "reject",
      suggestedAmount: 0,
      score,
      riskCategory,
      reasons: reasons.slice(0, 5),
      explanation,
      customerScores
    };
  }

  if (avgRequested > capacityBasedAmount && capacityBasedAmount > 0) {
    reasons.push("Requested amount exceeds estimated repayment capacity; lower amount is advised.");
    explanation.policyNotes.push("Policy rule: request above capacity leads to lower_loan recommendation.");
    return {
      decision: "lower_loan",
      suggestedAmount: capacityBasedAmount,
      score,
      riskCategory,
      reasons: reasons.slice(0, 5),
      explanation,
      customerScores
    };
  }

  if (validation.summary.warningRows > 0 || score < 620) {
    reasons.push("Warning signals are present; manual review is recommended before approval.");
    explanation.policyNotes.push("Policy rule: warning signals or score < 620 trigger manual_review.");
    return {
      decision: "manual_review",
      suggestedAmount: roundAmount(Math.max(avgRequested, 0)),
      score,
      riskCategory,
      reasons: reasons.slice(0, 5),
      explanation,
      customerScores
    };
  }

  reasons.push("Repayment capacity and data quality are within acceptable range for normal processing.");
  explanation.policyNotes.push("Policy rule: data quality and score thresholds permit proceed.");
  return {
    decision: "proceed",
    suggestedAmount: roundAmount(Math.max(avgRequested, 0)),
    score,
    riskCategory,
    reasons: reasons.slice(0, 5),
    explanation,
    customerScores
  };
}

// Test hook for golden dataset assertions.
export const recommendationInternalsForTest = {
  buildModelFeatures,
  calculateScoreFromFeatures
};
