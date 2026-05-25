import { z } from "zod";

export const borrowerRowSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null()])
);

export const validationRequestSchema = z.object({
  rows: z.array(borrowerRowSchema).min(1).max(5000)
});

export type BorrowerRow = z.infer<typeof borrowerRowSchema>;

export interface ValidationIssue {
  row: number;
  field: string;
  code: string;
  message: string;
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
}

export interface ValidationResult {
  summary: ValidationSummary;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const mandatoryFields = [
  "customerId",
  "accountOpeningDate",
  "monthlyInflow",
  "monthlyOutflow",
  "requestedLoanAmount",
  "requestedTenure"
] as const;

const numericFields = [
  "monthlyInflow",
  "monthlyOutflow",
  "requestedLoanAmount",
  "requestedTenure"
] as const;

const dateFields = ["accountOpeningDate"] as const;

function isMissing(value: string | number | null | undefined): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim().length === 0);
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

export function validateBorrowerRows(
  rows: BorrowerRow[]
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let validRows = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    let rowHasError = false;

    for (const field of mandatoryFields) {
      if (isMissing(row[field])) {
        rowHasError = true;
        errors.push({
          row: rowNumber,
          field,
          code: "REQUIRED_FIELD_MISSING",
          message: `${field} is mandatory`
        });
      }
    }

    for (const field of numericFields) {
      if (!isMissing(row[field]) && toNumber(row[field]) === null) {
        rowHasError = true;
        errors.push({
          row: rowNumber,
          field,
          code: "INVALID_NUMBER_FORMAT",
          message: `${field} must be numeric`
        });
      }
    }

    for (const field of dateFields) {
      const value = row[field];
      if (!isMissing(value) && typeof value === "string") {
        const timestamp = Date.parse(value);
        if (Number.isNaN(timestamp)) {
          rowHasError = true;
          errors.push({
            row: rowNumber,
            field,
            code: "INVALID_DATE_FORMAT",
            message: `${field} must be a valid date`
          });
        }
      }
    }

    const inflow = toNumber(row.monthlyInflow);
    const outflow = toNumber(row.monthlyOutflow);
    const requestedLoanAmount = toNumber(row.requestedLoanAmount);

    if (inflow !== null && outflow !== null && outflow > inflow) {
      warnings.push({
        row: rowNumber,
        field: "monthlyOutflow",
        code: "NEGATIVE_NET_CASHFLOW",
        message: "monthlyOutflow is greater than monthlyInflow"
      });
    }

    if (inflow !== null && requestedLoanAmount !== null && requestedLoanAmount > inflow * 12) {
      warnings.push({
        row: rowNumber,
        field: "requestedLoanAmount",
        code: "HIGH_REQUEST_TO_INFLOW_RATIO",
        message: "requestedLoanAmount is high relative to annualized inflow"
      });
    }

    if (!rowHasError) {
      validRows += 1;
    }
  });

  const totalRows = rows.length;
  const errorRows = new Set(errors.map((issue) => issue.row)).size;
  const warningRows = new Set(warnings.map((issue) => issue.row)).size;

  return {
    summary: {
      totalRows,
      validRows,
      errorRows,
      warningRows
    },
    errors,
    warnings
  };
}
