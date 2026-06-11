import { Router } from "express";
import { z } from "zod";

import { requireAuth, requireRole } from "../middleware/auth.js";
import { runFairnessAudit } from "../services/fairnessAudit.js";
import { getFairnessAuditRepository } from "../services/fairnessAuditRepository.js";

const fairnessAuditRequestSchema = z.object({
  retrainingRunId: z.string().min(1),
  modelVersion: z.string().min(1),
  applicants: z.array(
    z.object({
      applicantId: z.string().optional(),
      score: z.number().min(0).max(1000),
      gender: z.string().min(1),
      location: z.string().min(1),
      age: z.number().int().min(0).max(120).optional(),
      ageBand: z.string().optional(),
      balanceProfile: z.string().min(1),
      depositBehaviorProfile: z.string().min(1)
    })
  ).min(1)
});

export const fairnessRouter = Router();
const fairnessAuditRepository = getFairnessAuditRepository();

fairnessRouter.post(
  "/audits",
  requireAuth,
  requireRole(["risk_analyst", "credit_manager", "admin"]),
  async (req, res, next) => {
    const parsed = fairnessAuditRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        code: "INVALID_FAIRNESS_AUDIT_PAYLOAD",
        message: "Fairness audit payload is invalid",
        details: parsed.error.issues
      });
    }

    try {
      const result = runFairnessAudit(parsed.data);
      const persisted = await fairnessAuditRepository.create(result);

      return res.status(201).json(persisted);
    } catch (error) {
      return next(error);
    }
  }
);

fairnessRouter.get(
  "/audits",
  requireAuth,
  requireRole(["risk_analyst", "credit_manager", "admin", "auditor"]),
  async (req, res, next) => {
    const limit = Math.max(1, Math.min(200, Number.parseInt((req.query.limit as string) ?? "50", 10) || 50));

    try {
      const items = await fairnessAuditRepository.list(limit);
      return res.status(200).json({ items });
    } catch (error) {
      return next(error);
    }
  }
);
