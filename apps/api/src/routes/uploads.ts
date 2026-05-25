import { Router } from "express";
import multer from "multer";
import { z } from "zod";

import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBorrowerRows, validationRequestSchema } from "../services/validation.js";

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const allowedMimeTypes = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);

const uploadMetaSchema = z.object({
  institutionId: z.string().min(1),
  templateVersion: z.string().min(1)
});

export const uploadsRouter = Router();

uploadsRouter.post(
  "/uploads",
  requireAuth,
  requireRole(["loan_officer", "credit_manager", "admin"]),
  upload.single("file"),
  (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        code: "MISSING_FILE",
        message: "file is required",
        details: []
      });
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      return res.status(400).json({
        code: "INVALID_FILE_TYPE",
        message: "Only CSV and XLSX are supported",
        details: []
      });
    }

    const parsedMeta = uploadMetaSchema.safeParse(req.body);
    if (!parsedMeta.success) {
      return res.status(400).json({
        code: "INVALID_METADATA",
        message: "institutionId and templateVersion are required",
        details: parsedMeta.error.issues
      });
    }

    return res.status(201).json({
      uploadId: `upl_${crypto.randomUUID()}`,
      status: "received",
      receivedAt: new Date().toISOString(),
      fileName: file.originalname,
      createdBy: req.user?.id,
      institutionId: parsedMeta.data.institutionId,
      templateVersion: parsedMeta.data.templateVersion
    });
  }
);

uploadsRouter.post(
  "/uploads/:uploadId/validate",
  requireAuth,
  requireRole(["loan_officer", "credit_manager", "risk_analyst", "admin"]),
  (req, res) => {
    const uploadId = req.params.uploadId;
    const parsedBody = validationRequestSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({
        code: "INVALID_VALIDATION_PAYLOAD",
        message: "rows array is required for validation",
        details: parsedBody.error.issues
      });
    }

    const result = validateBorrowerRows(parsedBody.data.rows);

    return res.status(200).json({
      uploadId,
      status: "validated",
      summary: result.summary,
      errors: result.errors,
      warnings: result.warnings
    });
  }
);
