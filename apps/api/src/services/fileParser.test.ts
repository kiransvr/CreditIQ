test("parseBorrowerRowsFromUpload blocks prototype pollution via XLSX", async () => {
  // XLSX buffer with __proto__ as a header
  const XLSX = await import("xlsx");
  const data = [
    ["__proto__", "customerId", "accountOpeningDate", "monthlyInflow", "monthlyOutflow", "requestedLoanAmount", "requestedTenure"],
    ["polluted", "CUST-002", "2024-02-01", 2000, 1000, 4000, 24]
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const rows = await parseBorrowerRowsFromUpload("malicious.xlsx", buf);
  assert.equal(rows.length, 1);
  const row = rows[0] as Record<string, unknown>;
  assert.equal(row.customerId, "CUST-002");
  assert.equal(Object.hasOwn(row, "__proto__"), false);
  assert.equal(({} as { polluted?: string }).polluted, undefined);
});

test("parseBorrowerRowsFromUpload blocks prototype pollution via CSV with extra keys", async () => {
  const csv = [
    "constructor,customerId,accountOpeningDate,monthlyInflow,monthlyOutflow,requestedLoanAmount,requestedTenure",
    "polluted,CUST-003,2024-03-01,3000,1500,5000,36"
  ].join("\n");

  const rows = await parseBorrowerRowsFromUpload("borrowers.csv", Buffer.from(csv, "utf-8"));
  assert.equal(rows.length, 1);
  const row = rows[0] as Record<string, unknown>;
  assert.equal(row.customerId, "CUST-003");
  assert.equal(Object.hasOwn(row, "constructor"), false);
  assert.equal(({} as { polluted?: string }).polluted, undefined);
});
import assert from "node:assert/strict";
import test from "node:test";

import { parseBorrowerRowsFromUpload } from "./fileParser.js";

test("parseBorrowerRowsFromUpload blocks dangerous header keys", async () => {
  const csv = [
    "__proto__,customerId,accountOpeningDate,monthlyInflow,monthlyOutflow,requestedLoanAmount,requestedTenure",
    "polluted,CUST-001,2024-01-01,1000,500,3000,12"
  ].join("\n");

  const rows = await parseBorrowerRowsFromUpload("borrowers.csv", Buffer.from(csv, "utf-8"));

  assert.equal(rows.length, 1);
  const row = rows[0] as Record<string, unknown>;

  assert.equal(row.customerId, "CUST-001");
  assert.equal(Object.hasOwn(row, "__proto__"), false);
  assert.equal(({} as { polluted?: string }).polluted, undefined);
});

test("parseBorrowerRowsFromUpload rejects malformed xlsx buffers", async () => {
  await assert.rejects(
    () => parseBorrowerRowsFromUpload("broken.xlsx", Buffer.from("not a real xlsx", "utf-8")),
    /Unable to parse file/
  );
});

test("parseBorrowerRowsFromUpload rejects unsupported file extension", async () => {
  const csv = [
    "customerId,accountOpeningDate,monthlyInflow,monthlyOutflow,requestedLoanAmount,requestedTenure",
    "CUST-001,2024-01-01,1000,500,3000,12"
  ].join("\n");

  await assert.rejects(
    () => parseBorrowerRowsFromUpload("borrowers.txt", Buffer.from(csv, "utf-8")),
    /Unable to parse file/
  );
});
