import type { ValidationIssue, ValidationSummary } from "./validation.js";

interface ReportRecommendation {
  decision: string;
  suggestedAmount: number;
  reasons: string[];
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
  if (recommendation.reasons[0]) {
    lines.push(`summary,topRecommendationReason,${toCsvCell(recommendation.reasons[0])}`);
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
