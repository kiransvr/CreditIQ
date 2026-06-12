import type { ValidationIssue, ValidationSummary } from "./validation.js";

interface ReportRecommendation {
  decision: string;
  suggestedAmount: number;
  recommendedLoanMax: number;
  score: number;
  riskCategory: string;
  loanDecision: string;
  decisionRecommendation?: string;
  recommendedAction: string;
  color: string;
  fairnessFlag?: "DORMANT_ACCOUNT";
  errorCode?: string;
  message?: string;
  reasons: string[];
  explanation: {
    baseScore: number;
    components: Array<{
      label: string;
      impact: number;
      detail: string;
    }>;
    policyNotes: string[];
    marketAdjustment?: {
      factor: number;
      rawScore: number;
      adjustedScore: number;
      inflationPercent: number;
      devaluationPercent: number;
    };
  };
}

function toCsvCell(value: string | number): string {
  const stringValue = String(value);
  const escaped = stringValue.replaceAll('"', '""');
  return `"${escaped}"`;
}

export function buildValidationReportCsv(
  uploadId: string,
  summary: ValidationSummary,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  recommendation: ReportRecommendation
): string {
  const lines: string[] = [];

  lines.push("section,metric,value");
  lines.push(`summary,totalRows,${summary.totalRows}`);
  lines.push(`summary,validRows,${summary.validRows}`);
  lines.push(`summary,errorRows,${summary.errorRows}`);
  lines.push(`summary,warningRows,${summary.warningRows}`);
  lines.push(`summary,uploadId,${toCsvCell(uploadId)}`);
  lines.push(`summary,recommendedDecision,${toCsvCell(recommendation.decision)}`);
  lines.push(`summary,suggestedAmount,${recommendation.suggestedAmount}`);
  lines.push(`summary,recommendedLoanMax,${recommendation.recommendedLoanMax}`);
  lines.push(`summary,score,${recommendation.score}`);
  lines.push(`summary,riskCategory,${toCsvCell(recommendation.riskCategory)}`);
  lines.push(`summary,loanDecision,${toCsvCell(recommendation.loanDecision)}`);
  lines.push(`summary,decisionRecommendation,${toCsvCell(recommendation.decisionRecommendation ?? recommendation.loanDecision)}`);
  lines.push(`summary,recommendedAction,${toCsvCell(recommendation.recommendedAction)}`);
  lines.push(`summary,riskColor,${toCsvCell(recommendation.color)}`);
  if (recommendation.fairnessFlag) {
    lines.push(`summary,fairnessFlag,${toCsvCell(recommendation.fairnessFlag)}`);
  }
  if (recommendation.errorCode) {
    lines.push(`summary,errorCode,${toCsvCell(recommendation.errorCode)}`);
  }
  if (recommendation.message) {
    lines.push(`summary,errorMessage,${toCsvCell(recommendation.message)}`);
  }
  lines.push(`summary,baseScore,${recommendation.explanation.baseScore}`);
  if (recommendation.reasons[0]) {
    lines.push(`summary,topRecommendationReason,${toCsvCell(recommendation.reasons[0])}`);
  }
  if (recommendation.explanation.components[0]) {
    const topComponent = recommendation.explanation.components[0];
    lines.push(`summary,topScoreComponent,${toCsvCell(topComponent.label)}`);
    lines.push(`summary,topScoreImpact,${topComponent.impact}`);
  }
  if (recommendation.explanation.policyNotes[0]) {
    lines.push(`summary,topPolicyNote,${toCsvCell(recommendation.explanation.policyNotes[0])}`);
  }
  if (recommendation.explanation.marketAdjustment) {
    lines.push(`summary,marketAdjustmentFactor,${recommendation.explanation.marketAdjustment.factor}`);
    lines.push(`summary,rawScoreBeforeMarketAdjustment,${recommendation.explanation.marketAdjustment.rawScore}`);
    lines.push(`summary,adjustedScoreAfterMarketAdjustment,${recommendation.explanation.marketAdjustment.adjustedScore}`);
    lines.push(`summary,inflationPercent,${recommendation.explanation.marketAdjustment.inflationPercent}`);
    lines.push(`summary,devaluationPercent,${recommendation.explanation.marketAdjustment.devaluationPercent}`);
  }
  lines.push("");

  lines.push("issueType,row,field,code,message");

  for (const issue of errors) {
    lines.push([
      "error",
      issue.row,
      toCsvCell(issue.field),
      toCsvCell(issue.code),
      toCsvCell(issue.message)
    ].join(","));
  }

  for (const issue of warnings) {
    lines.push([
      "warning",
      issue.row,
      toCsvCell(issue.field),
      toCsvCell(issue.code),
      toCsvCell(issue.message)
    ].join(","));
  }

  return `${lines.join("\n")}\n`;
}
