


import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import auditRouter from "../routes/audit.js";

// Mock getDbPool to return a fake pool with query method
vi.mock("../db/client", () => ({
  getDbPool: () => ({
    query: async (sql: string, values?: any[]) => {
      if (sql.includes("FROM audit_events") && sql.includes("ORDER BY created_at DESC")) {
        // Return fake audit events
        return {
          rows: [
            {
              id: "1",
              actor_user_id: "user1",
              action_type: "UPLOAD",
              object_type: "file",
              object_id: "file1",
              metadata_json: { foo: "bar" },
              created_at: new Date().toISOString(),
            },
          ],
        };
      }
      return { rows: [] };
    },
  }),
}));

describe("Audit Log API", () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/audit", auditRouter);

  it("should return audit events (200)", async () => {
    const res = await request(app).get("/api/v1/audit/events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });


  it("should filter by actionType", async () => {
    const res = await request(app).get("/api/v1/audit/events").query({ actionType: "UPLOAD" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    if (res.body.items.length > 0) {
      expect(res.body.items.every((e: any) => e.action_type === "UPLOAD")).toBe(true);
    }
  });

  it("should filter by objectType", async () => {
    const res = await request(app).get("/api/v1/audit/events").query({ objectType: "file" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    if (res.body.items.length > 0) {
      expect(res.body.items.every((e: any) => e.object_type === "file")).toBe(true);
    }
  });

  it("should filter by objectId", async () => {
    const res = await request(app).get("/api/v1/audit/events").query({ objectId: "file1" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    if (res.body.items.length > 0) {
      expect(res.body.items.every((e: any) => e.object_id === "file1")).toBe(true);
    }
  });

  it("should filter by metadataSearch", async () => {
    const res = await request(app).get("/api/v1/audit/events").query({ metadataSearch: "bar" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    if (res.body.items.length > 0) {
      expect(res.body.items.some((e: any) => JSON.stringify(e.metadata_json).includes("bar"))).toBe(true);
    }
  });

  it("should export audit events as CSV", async () => {
    const res = await request(app).get("/api/v1/audit/events/export");
    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toContain("text/csv");
    expect(res.text).toContain("id,actor_user_id,action_type");
  });
});
