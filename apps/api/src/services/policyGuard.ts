import type { BorrowerRow } from "./validation.js";
import { PolicyViolationError } from "../errors/policyViolation.js";

const prohibitedFieldAliases = new Map<string, string>([
  ["gender", "Gender"],
  ["sex", "Gender"],
  ["religion", "Religion"],
  ["ethnicity", "Ethnicity"],
  ["tribe", "Tribe/Clan"],
  ["clan", "Tribe/Clan"],
  ["politicalaffiliation", "Political affiliation"],
  ["politicalparty", "Political affiliation"],
  ["maritalstatus", "Marital status"],
  ["numberofchildren", "Number of children"],
  ["children", "Number of children"],
  ["disabilitystatus", "Disability status"],
  ["hivstatus", "HIV status"],
  ["hiv", "HIV status"]
]);

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function assertNoProhibitedFeatures(rows: BorrowerRow[]): void {
  const violations: Array<{ row: number; field: string; prohibitedCategory: string }> = [];

  rows.forEach((row, rowIndex) => {
    Object.keys(row).forEach((key) => {
      const normalized = normalizeFieldName(key);
      const prohibitedCategory = prohibitedFieldAliases.get(normalized);
      if (prohibitedCategory) {
        violations.push({
          row: rowIndex + 1,
          field: key,
          prohibitedCategory
        });
      }
    });
  });

  if (violations.length > 0) {
    throw new PolicyViolationError(
      "PROHIBITED_FEATURE_PRESENT",
      "Prohibited sensitive features detected in the model feature vector. Validation aborted.",
      400,
      violations
    );
  }
}
