import * as XLSX from "xlsx";

import type { BorrowerRow } from "./validation.js";

const headerAliases: Record<string, string> = {
  customerid: "customerId",
  customer_id: "customerId",
  dateofbirth: "dateOfBirth",
  date_of_birth: "dateOfBirth",
  dob: "dateOfBirth",
  gender: "gender",
  branchcode: "branchCode",
  branch_code: "branchCode",
  branchid: "branchCode",
  branch_id: "branchCode",
  branchname: "branchName",
  branch_name: "branchName",
  urbanruralflag: "urbanRuralFlag",
  urban_rural_flag: "urbanRuralFlag",
  region: "region",
  accountopendate: "accountOpeningDate",
  account_open_date: "accountOpeningDate",
  accountstatus: "accountStatus",
  account_status: "accountStatus",
  customersegment: "customerSegment",
  customer_segment: "customerSegment",
  customername: "customerName",
  customer_name: "customerName",
  fullname: "customerName",
  full_name: "customerName",
  name: "customerName",
  accountopeningdate: "accountOpeningDate",
  account_opening_date: "accountOpeningDate",
  monthlyinflow: "monthlyInflow",
  monthly_inflow: "monthlyInflow",
  monthlyoutflow: "monthlyOutflow",
  monthly_outflow: "monthlyOutflow",
  requestedloanamount: "requestedLoanAmount",
  requested_loan_amount: "requestedLoanAmount",
  requestedtenure: "requestedTenure",
  requested_tenure: "requestedTenure",
  loantermonths: "loanTermMonths",
  loan_term_months: "loanTermMonths",
  productmaxloanlimit: "productMaxLoanLimit",
  product_max_loan_limit: "productMaxLoanLimit",
  avgbalance6m: "avg_balance_6m",
  avg_balance_6m: "avg_balance_6m"
};

const blockedKeys = new Set(["__proto__", "prototype", "constructor"]);

function normalizeHeader(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}

function toCanonicalKey(value: string): string {
  const normalized = normalizeHeader(value);
  const alias = headerAliases[normalized];
  return Object.hasOwn(headerAliases, normalized) && typeof alias === "string" ? alias : value.trim();
}

function isBlockedKey(value: string): boolean {
  const key = value.trim().toLowerCase();
  return blockedKeys.has(key);
}

function toCellValue(value: unknown): string | number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Accept DD-MM-YYYY from demo files and normalize to YYYY-MM-DD.
    const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
    if (dmy) {
      const [, dd, mm, yyyy] = dmy;
      return `${yyyy}-${mm}-${dd}`;
    }

    return trimmed;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value);
}

function mapRawRow(rawRow: Record<string, unknown>): BorrowerRow {
  const mapped = Object.create(null) as BorrowerRow;

  for (const [rawKey, rawValue] of Object.entries(rawRow)) {
    if (!rawKey.trim()) {
      continue;
    }

    const canonicalKey = toCanonicalKey(rawKey);
    if (isBlockedKey(canonicalKey)) {
      continue;
    }

    mapped[canonicalKey] = toCellValue(rawValue);
  }

  return mapped;
}

function finalizeRows(rows: BorrowerRow[]): BorrowerRow[] {
  const parsedRows = rows.filter((row) => Object.keys(row).length > 0);

  if (parsedRows.length === 0) {
    throw new Error("Uploaded file has no data rows");
  }

  if (parsedRows.length > 5000) {
    throw new Error("Uploaded file exceeds 5000 rows. Split the file and upload smaller batches.");
  }

  return parsedRows;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsvRows(fileContent: Buffer): BorrowerRow[] {
  const text = fileContent.toString("utf-8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const headerLine = lines[0];
  if (!headerLine) {
    throw new Error("Uploaded file has no data rows");
  }

  const headers = parseCsvLine(headerLine).map((header) => header.trim());
  const dataLines = lines.slice(1);

  const rows = dataLines.map((line) => {
    const values = parseCsvLine(line);
    const rawRow: Record<string, unknown> = Object.create(null);

    headers.forEach((header, index) => {
      const value = values[index];
      rawRow[header] = value === undefined || value.trim().length === 0 ? null : value;
    });

    return mapRawRow(rawRow);
  });

  return finalizeRows(rows);
}

async function parseXlsxRows(fileContent: Buffer): Promise<BorrowerRow[]> {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fileContent, { type: "buffer" });
  } catch {
    throw new Error("Unable to parse file. Ensure it is valid CSV or XLSX.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Unable to parse file. Ensure it is valid CSV or XLSX.");
  }
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error("Unable to parse file. Ensure it is valid CSV or XLSX.");
  }
  let rows: Record<string, unknown>[] = [];
  try {
    rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  } catch {
    throw new Error("Unable to parse file. Ensure it is valid CSV or XLSX.");
  }
  if (rows.length === 0) {
    throw new Error("Unable to parse file. Ensure it is valid CSV or XLSX.");
  }
  const mappedRows = rows.map(mapRawRow);
  return finalizeRows(mappedRows);
}

export async function parseBorrowerRowsFromUpload(fileName: string, fileContent: Buffer): Promise<BorrowerRow[]> {
  if (fileContent.length === 0) {
    throw new Error("Uploaded file is empty");
  }

  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.endsWith(".csv")) {
    return parseCsvRows(fileContent);
  }

  if (lowerFileName.endsWith(".xlsx")) {
    return parseXlsxRows(fileContent);
  }

  throw new Error(`Unable to parse file ${fileName}. Ensure it is valid CSV or XLSX.`);
}
