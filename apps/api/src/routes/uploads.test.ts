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
  assert.equal(validateResponse.body.recommendation.decision, "manual_review");
  assert.equal(typeof validateResponse.body.recommendation.suggestedAmount, "number");
  assert.equal(typeof validateResponse.body.recommendation.score, "number");
  assert.match(validateResponse.body.recommendation.riskCategory, /low|medium|high|very_high/);
  const explanation = validateResponse.body.recommendation.explanation;
  assert.equal(typeof explanation.baseScore, "number");
  assert.equal(Array.isArray(explanation.components), true);
  assert.equal(Array.isArray(explanation.policyNotes), true);
  assert.equal(Array.isArray(explanation.weightedSignals), true);
  assert.ok(explanation.weightedSignals.length > 0);
  assert.equal(Array.isArray(explanation.rationaleCategories), true);
  assert.ok(explanation.rationaleCategories.length > 0);
  assert.equal(Array.isArray(explanation.scoreTrend), true);
  assert.ok(explanation.scoreTrend.length > 0);

  const getResponse = await request(app)
    .get(`/api/v1/uploads/${uploadId}`)
    .set(authHeaders("auditor"));

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body.uploadId, uploadId);
  assert.equal(getResponse.body.summary.totalRows, 2);
  assert.equal(getResponse.body.recommendation.decision, "manual_review");
  assert.equal(typeof getResponse.body.recommendation.score, "number");
  assert.match(getResponse.body.recommendation.riskCategory, /low|medium|high|very_high/);
  const getExplanation = getResponse.body.recommendation.explanation;
  assert.equal(typeof getExplanation.baseScore, "number");
  assert.equal(Array.isArray(getExplanation.weightedSignals), true);
  assert.equal(Array.isArray(getExplanation.rationaleCategories), true);
  assert.equal(Array.isArray(getExplanation.scoreTrend), true);

  const invalidOverrideResponse = await request(app)
    .post(`/api/v1/uploads/${uploadId}/override`)
    .set(authHeaders("credit_manager"))
    .send({
      decision: "manual_review",
      reason: "too short"
    });

  assert.equal(invalidOverrideResponse.status, 400);
  assert.equal(invalidOverrideResponse.body.code, "INVALID_OVERRIDE_PAYLOAD");

  const overrideResponse = await request(app)
    .post(`/api/v1/uploads/${uploadId}/override`)
    .set(authHeaders("credit_manager"))
    .send({
      decision: "manual_review",
      reason: "Data quality concerns require credit manager review."
    });

  assert.equal(overrideResponse.status, 200);
  assert.equal(overrideResponse.body.override.decision, "manual_review");
  assert.equal(typeof overrideResponse.body.override.overriddenAt, "string");

  const getAfterOverrideResponse = await request(app)
    .get(`/api/v1/uploads/${uploadId}`)
    .set(authHeaders("auditor"));

  assert.equal(getAfterOverrideResponse.status, 200);
  assert.equal(getAfterOverrideResponse.body.override.decision, "manual_review");

  const reportResponse = await request(app)
    .get(`/api/v1/uploads/${uploadId}/report`)
    .set(authHeaders("auditor"));

  assert.equal(reportResponse.status, 200);
  const contentType = reportResponse.headers["content-type"] ?? "";
  assert.match(contentType, /text\/csv/);
  assert.match(reportResponse.text, /summary,totalRows,2/);
  assert.match(reportResponse.text, /summary,recommendedDecision/);
  assert.match(reportResponse.text, /summary,score,/);
  assert.match(reportResponse.text, /summary,riskCategory,/);
  assert.match(reportResponse.text, /summary,baseScore,/);
  assert.match(reportResponse.text, /summary,topPolicyNote,/);
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

test("validate returns parse error for malformed xlsx upload", async () => {
  const app = createApp();

  const uploadResponse = await request(app)
    .post("/api/v1/uploads")
    .set(authHeaders())
    .field("institutionId", "demo-bank")
    .field("templateVersion", "v1")
    .attach("file", Buffer.from("not a valid xlsx", "utf-8"), {
      filename: "broken.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

  assert.equal(uploadResponse.status, 201);
  const uploadId = uploadResponse.body.uploadId as string;

  const validateResponse = await request(app)
    .post(`/api/v1/uploads/${uploadId}/validate`)
    .set(authHeaders("risk_analyst"))
    .send({});

  assert.equal(validateResponse.status, 400);
  assert.equal(validateResponse.body.code, "UPLOAD_PARSE_FAILED");
});

test("validate fails loudly when prohibited sensitive fields are present", async () => {
  const app = createApp();

  const csv = [
    "customerId,accountOpeningDate,monthlyInflow,monthlyOutflow,requestedLoanAmount,requestedTenure,gender,maritalStatus",
    "CUST-001,2024-01-01,1000,500,3000,12,Female,Married"
  ].join("\n");

  const uploadResponse = await request(app)
    .post("/api/v1/uploads")
    .set(authHeaders())
    .field("institutionId", "demo-bank")
    .field("templateVersion", "v1")
    .attach("file", Buffer.from(csv, "utf-8"), {
      filename: "borrowers-sensitive.csv",
      contentType: "text/csv"
    });

  assert.equal(uploadResponse.status, 201);
  const uploadId = uploadResponse.body.uploadId as string;

  const validateResponse = await request(app)
    .post(`/api/v1/uploads/${uploadId}/validate`)
    .set(authHeaders("risk_analyst"))
    .send({});

  assert.equal(validateResponse.status, 400);
  assert.equal(validateResponse.body.code, "PROHIBITED_FEATURE_PRESENT");
  assert.equal(Array.isArray(validateResponse.body.details), true);
  assert.ok(validateResponse.body.details.length >= 1);
});
