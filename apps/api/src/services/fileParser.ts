import * as XLSX from "xlsx";

import type { BorrowerRow } from "./validation.js";

const headerAliases: Record<string, string> = {
  customerid: "customerId",
  customer_id: "customerId",
  accountopeningdate: "accountOpeningDate",
  account_opening_date: "accountOpeningDate",
  monthlyinflow: "monthlyInflow",
  monthly_inflow: "monthlyInflow",
  monthlyoutflow: "monthlyOutflow",
  monthly_outflow: "monthlyOutflow",
  requestedloanamount: "requestedLoanAmount",
  requested_loan_amount: "requestedLoanAmount",
  requestedtenure: "requestedTenure",
  requested_tenure: "requestedTenure"
};

function normalizeHeader(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}

function toCanonicalKey(value: string): string {
  const normalized = normalizeHeader(value);
  return headerAliases[normalized] ?? value.trim();
}

function toCellValue(value: unknown): string | number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

export function parseBorrowerRowsFromUpload(fileName: string, fileContent: Buffer): BorrowerRow[] {
  if (fileContent.length === 0) {
    throw new Error("Uploaded file is empty");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fileContent, { type: "buffer" });
  } catch {
    throw new Error(`Unable to parse file ${fileName}. Ensure it is valid CSV or XLSX.`);
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Uploaded file does not contain a readable sheet");
  }

  const firstSheet = workbook.Sheets[firstSheetName];
  if (!firstSheet) {
    throw new Error("Uploaded file does not contain a readable worksheet");
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: null,
    raw: false
  });

  const parsedRows: BorrowerRow[] = rawRows
    .map((rawRow) => {
      const mapped: BorrowerRow = {};

      for (const [rawKey, rawValue] of Object.entries(rawRow)) {
        if (!rawKey.trim()) {
          continue;
        }

        const canonicalKey = toCanonicalKey(rawKey);
        mapped[canonicalKey] = toCellValue(rawValue);
      }

      return mapped;
    })
    .filter((row) => Object.keys(row).length > 0);

  if (parsedRows.length === 0) {
    throw new Error("Uploaded file has no data rows");
  }

  if (parsedRows.length > 5000) {
    throw new Error("Uploaded file exceeds 5000 rows. Split the file and upload smaller batches.");
  }

  return parsedRows;
}
