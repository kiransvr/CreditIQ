import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

import { createApp } from "../app.js";

function authHeaders(role = "loan_officer") {
  return {
    authorization: "Bearer dev-token",
    "x-user-id": "tester",
    "x-user-role": role,
    "x-institution-id": "demo-bank"
  };
}

test("upload, validate from file, fetch upload, and download report", async () => {
  const app = createApp();

  const csv = [
    "customerId,accountOpeningDate,monthlyInflow,monthlyOutflow,requestedLoanAmount,requestedTenure",
    "CUST-001,2024-01-01,1000,1200,5000,12",
    "CUST-002,2024-02-10,,400,1500,6"
  ].join("\n");

  const uploadResponse = await request(app)
    .post("/api/v1/uploads")
    .set(authHeaders())
    .field("institutionId", "demo-bank")
    .field("templateVersion", "v1")
    .attach("file", Buffer.from(csv, "utf-8"), {
      filename: "borrowers.csv",
      contentType: "text/csv"
    });

  assert.equal(uploadResponse.status, 201);
  assert.equal(uploadResponse.body.status, "received");
  assert.equal(typeof uploadResponse.body.uploadId, "string");

  const uploadId = uploadResponse.body.uploadId as string;

  const validateResponse = await request(app)
    .post(`/api/v1/uploads/${uploadId}/validate`)
    .set(authHeaders("risk_analyst"))
    .send({});

  assert.equal(validateResponse.status, 200);
  assert.equal(validateResponse.body.status, "validated");
  assert.equal(validateResponse.body.summary.totalRows, 2);
  assert.equal(validateResponse.body.summary.errorRows, 1);
  assert.equal(validateResponse.body.summary.warningRows, 1);

  const getResponse = await request(app)
    .get(`/api/v1/uploads/${uploadId}`)
    .set(authHeaders("auditor"));

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.uploadId, uploadId);
  assert.equal(getResponse.body.summary.totalRows, 2);

  const reportResponse = await request(app)
    .get(`/api/v1/uploads/${uploadId}/report`)
    .set(authHeaders("auditor"));

  assert.equal(reportResponse.status, 200);
  const contentType = reportResponse.headers["content-type"] ?? "";
  assert.match(contentType, /text\/csv/);
  assert.match(reportResponse.text, /summary,totalRows,2/);
  assert.match(reportResponse.text, /issueType,row,field,code,message/);
});

test("upload requires authentication", async () => {
  const app = createApp();

  const csv = [
    "customerId,accountOpeningDate,monthlyInflow,monthlyOutflow,requestedLoanAmount,requestedTenure",
    "CUST-001,2024-01-01,1000,500,5000,12"
  ].join("\n");

  const response = await request(app)
    .post("/api/v1/uploads")
    .field("institutionId", "demo-bank")
    .field("templateVersion", "v1")
    .attach("file", Buffer.from(csv, "utf-8"), {
      filename: "borrowers.csv",
      contentType: "text/csv"
    });

  assert.equal(response.status, 401);
  assert.equal(response.body.code, "UNAUTHORIZED");
});
