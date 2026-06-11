import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

import { createApp } from "../app.js";

function authHeaders(role = "risk_analyst") {
  return {
    authorization: "Bearer dev-token",
    "x-user-id": "tester",
    "x-user-role": role,
    "x-institution-id": "demo-bank"
  };
}

test("fairness audit persists result and flags reweighting when gap exceeds threshold", async () => {
  const app = createApp();

  const response = await request(app)
    .post("/api/v1/fairness/audits")
    .set(authHeaders("risk_analyst"))
    .send({
      retrainingRunId: "rr-20260611-01",
      modelVersion: "v2.0.0",
      applicants: [
        {
          applicantId: "A1",
          score: 720,
          gender: "male",
          location: "urban",
          age: 26,
          balanceProfile: "high_stable",
          depositBehaviorProfile: "salary_regular"
        },
        {
          applicantId: "A2",
          score: 600,
          gender: "female",
          location: "urban",
          age: 27,
          balanceProfile: "high_stable",
          depositBehaviorProfile: "salary_regular"
        }
      ]
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.result.overallStatus, "fail");
  assert.equal(response.body.result.reweightingRequired, true);
  assert.equal(Array.isArray(response.body.result.pairAudits), true);
  assert.equal(response.body.result.pairAudits.length, 3);
});

test("fairness audits are retrievable for auditor role", async () => {
  const app = createApp();

  const response = await request(app)
    .get("/api/v1/fairness/audits")
    .set(authHeaders("auditor"));

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(response.body.items), true);
});
