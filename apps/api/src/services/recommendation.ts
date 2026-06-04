import type { BorrowerRow, ValidationResult } from "./validation.js";

export type RecommendationDecision = "proceed" | "lower_loan" | "manual_review" | "reject";
export type RiskCategory = "low" | "medium" | "high" | "very_high";

export interface ScoreComponent {
  key: "data_quality" | "warning_signals" | "cashflow_strength" | "capacity_pressure";
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

function calculateScoreWithExplanation(
  validation: ValidationResult,
  avgInflow: number,
  avgOutflow: number,
  netCashflow: number,
  avgRequested: number,
  capacityBasedAmount: number
): { score: number; explanation: RecommendationExplanation } {
  const baseScore = 700;
  let score = baseScore;
  const components: ScoreComponent[] = [];

  const dataQualityImpact = -(validation.summary.errorRows * 120);
  if (dataQualityImpact !== 0) {
    components.push({
      key: "data_quality",
      label: "Data quality errors",
      impact: dataQualityImpact,
      detail: `${validation.summary.errorRows} rows contain blocking validation errors.`
    });
    score += dataQualityImpact;
  }

  const warningImpact = -(validation.summary.warningRows * 40);
  if (warningImpact !== 0) {
    components.push({
      key: "warning_signals",
      label: "Warning signals",
      impact: warningImpact,
      detail: `${validation.summary.warningRows} rows contain non-blocking warning signals.`
    });
    score += warningImpact;
  }

  if (avgInflow > 0) {
    const netRatio = netCashflow / avgInflow;
    const cashflowImpact = Math.round(clamp(netRatio, -0.5, 0.5) * 200);
    components.push({
      key: "cashflow_strength",
      label: "Cashflow strength",
      impact: cashflowImpact,
      detail: `Average net cashflow ratio is ${Math.round(netRatio * 100)}% of inflow.`
    });
    score += cashflowImpact;
  }

  if (capacityBasedAmount > 0 && avgRequested > 0) {
    const pressureRatio = avgRequested / capacityBasedAmount;
    if (pressureRatio > 1) {
      const capacityImpact = -Math.round(Math.min((pressureRatio - 1) * 200, 180));
      components.push({
        key: "capacity_pressure",
        label: "Capacity pressure",
        impact: capacityImpact,
        detail: `Requested amount is ${Math.round(pressureRatio * 100)}% of estimated capacity.`
      });
      score += capacityImpact;
    }
  }

  const finalScore = Math.round(clamp(score, 0, 1000));

  // Weighted signals (example: inflow, outflow, net cashflow, requested amount)
  const weightedSignals = [
    { key: "avgInflow", label: "Average Inflow", weight: 0.3, value: avgInflow, impact: Math.round(avgInflow * 0.3) },
    { key: "avgOutflow", label: "Average Outflow", weight: 0.2, value: avgOutflow, impact: Math.round(avgOutflow * 0.2) },
    { key: "netCashflow", label: "Net Cashflow", weight: 0.3, value: netCashflow, impact: Math.round(netCashflow * 0.3) },
    { key: "avgRequested", label: "Requested Amount", weight: 0.2, value: avgRequested, impact: Math.round(avgRequested * 0.2) }
  ];

  // Rationale categories
  const rationaleCategories = [
    { category: "data_quality", rationale: `${validation.summary.errorRows} error rows, ${validation.summary.warningRows} warning rows`, impact: dataQualityImpact + warningImpact },
    { category: "cashflow", rationale: `Net cashflow: ${netCashflow}`, impact: avgInflow > 0 ? Math.round(clamp(netCashflow / avgInflow, -0.5, 0.5) * 200) : 0 },
    { category: "policy", rationale: `Policy notes: ${[...components.map(c => c.label), ...[]].join(", ")}`, impact: 0 }
  ];

  // Score trend (for now, just baseScore and finalScore)
  const scoreTrend = [
    { label: "Base Score", value: baseScore },
    { label: "Final Score", value: finalScore }
  ];

  return {
    score: finalScore,
    explanation: {
      baseScore,
      components,
      policyNotes: [],
      weightedSignals,
      rationaleCategories,
      scoreTrend
    }
  };
}

function buildCustomerScores(rows: BorrowerRow[], validation: ValidationResult): CustomerScore[] {
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

    const monthlyInflow = getNumberValue(row, ["monthlyInflow", "monthly_inflow"]);
    const monthlyOutflow = getNumberValue(row, ["monthlyOutflow", "monthly_outflow"]);
    const requestedLoanAmount = getNumberValue(row, ["requestedLoanAmount", "requested_loan_amount"]);
    const currentBalance = getNumberValue(row, ["currentBalance", "current_balance", "averageBalance", "accountBalance"]);
    const depositCount = getNumberValue(row, [
      "depositsLast12To24Months",
      "deposits_12_24_months",
      "numberOfDepositsLast12To24Months"
    ]);
    const defaultsCount = getNumberValue(row, [
      "defaultsLast12To24Months",
      "defaults_12_24_months",
      "anyDefaultsLast12To24Months"
    ]);
    const liabilitiesOutstanding = getNumberValue(row, [
      "existingLiabilitiesTotalOutstanding",
      "existing_liabilities_total_outstanding",
      "totalOutstandingLiabilities"
    ]);
    const liabilitiesMonthly = getNumberValue(row, [
      "existingLiabilitiesMonthlyObligation",
      "existing_liabilities_monthly_obligation",
      "monthlyLiabilityPayment"
    ]);

    let score = 600;
    let confidence = 100;
    const reasons: string[] = [];

    const accountOpenRaw = getTextValue(row, ["accountOpeningDate", "account_opening_date"]);
    if (accountOpenRaw) {
      const opened = Date.parse(accountOpenRaw);
      if (!Number.isNaN(opened)) {
        const activeMonths = Math.max(0, (Date.now() - opened) / (1000 * 60 * 60 * 24 * 30.4375));
        const stabilityBoost = Math.round(clamp(activeMonths / 60, 0, 1) * 80);
        score += stabilityBoost;
        reasons.push(`Account stability contributed +${stabilityBoost}.`);
      }
    } else {
      confidence -= 12;
      reasons.push("Account opening date is missing; confidence reduced.");
    }

    if (depositCount !== null) {
      const depositBoost = Math.round(clamp(depositCount / 24, 0, 1) * 60);
      score += depositBoost;
      reasons.push(`Deposit regularity contributed +${depositBoost}.`);
    } else {
      confidence -= 10;
      reasons.push("Deposit regularity data is missing; confidence reduced.");
    }

    if (monthlyInflow !== null && monthlyOutflow !== null) {
      const net = monthlyInflow - monthlyOutflow;
      const balanceBehaviorImpact = Math.round(clamp(net / Math.max(monthlyInflow, 1), -0.5, 0.5) * 120);
      score += balanceBehaviorImpact;
      reasons.push(`Balance behavior impact ${balanceBehaviorImpact >= 0 ? "+" : ""}${balanceBehaviorImpact}.`);
    } else if (currentBalance !== null) {
      const balanceFallbackImpact = Math.round(clamp(currentBalance / 50000, -0.5, 0.5) * 80);
      score += balanceFallbackImpact;
      reasons.push(`Current balance trend proxy impact ${balanceFallbackImpact >= 0 ? "+" : ""}${balanceFallbackImpact}.`);
    } else {
      confidence -= 10;
      reasons.push("Balance behavior inputs are incomplete; confidence reduced.");
    }

    if (defaultsCount !== null) {
      const defaultPenalty = -Math.round(clamp(defaultsCount, 0, 3) * 90);
      score += defaultPenalty;
      reasons.push(`Repayment history impact ${defaultPenalty}.`);
    } else {
      reasons.push("No default-history data found; customer is not auto-penalized.");
    }

    if (monthlyInflow !== null && monthlyOutflow !== null) {
      const monthlyDebt = liabilitiesMonthly ?? 0;
      const debtBurden = monthlyDebt + monthlyOutflow;
      const capacityRatio = debtBurden / Math.max(monthlyInflow, 1);
      const debtImpact = -Math.round(clamp(capacityRatio - 0.4, -0.3, 0.6) * 180);
      score += debtImpact;
      reasons.push(`Cashflow and debt burden impact ${debtImpact >= 0 ? "+" : ""}${debtImpact}.`);
    } else {
      confidence -= 10;
      reasons.push("Cashflow/debt burden inputs are incomplete; confidence reduced.");
    }

    if (liabilitiesOutstanding !== null && liabilitiesOutstanding > 0 && monthlyInflow !== null) {
      const outstandingRatio = liabilitiesOutstanding / Math.max(monthlyInflow * 12, 1);
      if (outstandingRatio > 1.5) {
        const outstandingPenalty = -Math.round(Math.min((outstandingRatio - 1.5) * 60, 120));
        score += outstandingPenalty;
        reasons.push(`High outstanding liabilities impact ${outstandingPenalty}.`);
      }
    }

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

    const netCashflow = (monthlyInflow ?? 0) - (monthlyOutflow ?? 0) - (liabilitiesMonthly ?? 0);
    const capacityBasedAmount = roundAmount(Math.max(netCashflow, 0) * 10);
    const requested = requestedLoanAmount ?? 0;

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

export function generateRecommendation(rows: BorrowerRow[], validation: ValidationResult): RecommendationResult {

  const customerScores = buildCustomerScores(rows, validation);

  const inflows: number[] = [];
  const outflows: number[] = [];
  const requestedAmounts: number[] = [];

  for (const row of rows) {
    const inflow = toNumber(row.monthlyInflow);
    const outflow = toNumber(row.monthlyOutflow);
    const requested = toNumber(row.requestedLoanAmount);

    if (typeof inflow === "number" && Number.isFinite(inflow)) {
      inflows.push(inflow);
    }

    if (typeof outflow === "number" && Number.isFinite(outflow)) {
      outflows.push(outflow);
    }

    if (typeof requested === "number" && Number.isFinite(requested)) {
      requestedAmounts.push(requested);
    }
  }

  // Defensive: If no valid outflows, set avgOutflow to 0
  const avgInflow = inflows.length > 0 ? average(inflows) : 0;
  const avgOutflow = outflows.length > 0 ? average(outflows) : 0;
  const avgRequested = requestedAmounts.length > 0 ? average(requestedAmounts) : 0;
  const netCashflow = avgInflow - avgOutflow;
  const capacityBasedAmount = roundAmount(netCashflow * 10);
  const scored = calculateScoreWithExplanation(validation, avgInflow, avgOutflow, netCashflow, avgRequested, capacityBasedAmount);
  const score = customerScores.length > 0
    ? Math.round(average(customerScores.map((item) => item.score)))
    : scored.score;
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
