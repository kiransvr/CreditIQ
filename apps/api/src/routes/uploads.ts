import { type Response, Router } from "express";
import multer from "multer";
import { z } from "zod";

import { requireAuth, requireRole } from "../middleware/auth.js";
import { parseBorrowerRowsFromUpload } from "../services/fileParser.js";
import { assertNoProhibitedFeatures } from "../services/policyGuard.js";
import { generateRecommendation } from "../services/recommendation.js";
import { buildValidationReportCsv } from "../services/report.js";
import { getUploadRepository } from "../services/uploadRepository.js";
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

const overrideSchema = z.object({
  decision: z.enum(["proceed", "lower_loan", "manual_review", "reject"]),
  reason: z.string().min(10)
});

export const uploadsRouter = Router();
const uploadRepository = getUploadRepository();

function getUploadIdFromParams(uploadId: string | undefined, res: Response) {
  if (!uploadId) {
    res.status(400).json({
      code: "INVALID_UPLOAD_ID",
      message: "uploadId is required",
      details: []
    });

    return null;
  }

  return uploadId;
}

uploadsRouter.post(
  "/uploads",
  requireAuth,
  requireRole(["loan_officer", "credit_manager", "admin"]),
  upload.single("file"),
  async (req, res, next) => {
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

    const actor = req.user;
    if (!actor) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "User context is missing",
        details: []
      });
    }

    try {
      const created = await uploadRepository.createUpload({
        institutionCode: parsedMeta.data.institutionId,
        templateVersion: parsedMeta.data.templateVersion,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileContent: file.buffer,
        actor: {
          username: actor.id,
          role: actor.role
        }
      });

      return res.status(201).json(created);
    } catch (error) {
      return next(error);
    }
  }
);

uploadsRouter.post(
  "/uploads/:uploadId/validate",
  requireAuth,
  requireRole(["loan_officer", "credit_manager", "risk_analyst", "admin"]),
  async (req, res, next) => {
    const uploadId = getUploadIdFromParams(req.params.uploadId, res);
    if (!uploadId) {
      return;
    }
    const parsedBody = validationRequestSchema.safeParse(req.body ?? {});

    if (!parsedBody.success) {
      return res.status(400).json({
        code: "INVALID_VALIDATION_PAYLOAD",
        message: "Payload is invalid",
        details: parsedBody.error.issues
      });
    }

    try {
      let rows = parsedBody.data.rows;
      if (!rows) {
        const fileSource = await uploadRepository.getUploadFileSource(uploadId);
        if (!fileSource) {
          return res.status(404).json({
            code: "UPLOAD_NOT_FOUND",
            message: "Upload was not found",
            details: []
          });
        }
        try {
          rows = await parseBorrowerRowsFromUpload(fileSource.fileName, fileSource.fileContent);
        } catch (error) {
          return res.status(400).json({
            code: "UPLOAD_PARSE_FAILED",
            message: error instanceof Error ? error.message : "Unable to parse uploaded file",
            details: []
          });
        }
      }
      assertNoProhibitedFeatures(rows);
      const result = validateBorrowerRows(rows);
      const recommendation = generateRecommendation(rows, result);
      const persisted = await uploadRepository.validateUpload(uploadId, rows, result, recommendation);
      if (!persisted) {
        return res.status(404).json({
          code: "UPLOAD_NOT_FOUND",
          message: "Upload was not found",
          details: []
        });
      }
      return res.status(200).json(persisted);
    } catch (error) {
      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error("/uploads/:uploadId/validate error:", error);
      return next(error);
    }
  }
);

uploadsRouter.get(
  "/uploads/:uploadId",
  requireAuth,
  requireRole(["loan_officer", "credit_manager", "risk_analyst", "admin", "auditor"]),
  async (req, res, next) => {
    const uploadId = getUploadIdFromParams(req.params.uploadId, res);
    if (!uploadId) {
      return;
    }

    // Parse pagination/filter/sort/search params
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string) || 20));
    const filter = req.query.filter === "errors" || req.query.filter === "warnings" ? req.query.filter : "all";
    const sort = req.query.sort === "row" || req.query.sort === "type" || req.query.sort === "code" ? req.query.sort : "row";
    const direction = req.query.direction === "desc" ? "desc" : "asc";
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    try {
      const record = await uploadRepository.getUpload(uploadId);
      if (!record) {
        return res.status(404).json({
          code: "UPLOAD_NOT_FOUND",
          message: "Upload was not found",
          details: []
        });
      }
      const diagnosticsPage = await uploadRepository.getUploadDiagnosticsPage(uploadId, {
        page,
        pageSize,
        filter,
        sort,
        direction,
        search
      });
      if (!diagnosticsPage) {
        return res.status(404).json({
          code: "UPLOAD_NOT_FOUND",
          message: "Upload was not found",
          details: []
        });
      }
      // Compose response: replace errors/warnings with diagnostics page
      const {
        errors, warnings, ...rest
      } = record;
      return res.status(200).json({
        ...rest,
        diagnostics: diagnosticsPage
      });
    } catch (error) {
      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error("GET /uploads/:uploadId error:", error);
      return next(error);
    }
  }
);

uploadsRouter.post(
  "/uploads/:uploadId/override",
  requireAuth,
  requireRole(["credit_manager", "admin"]),
  async (req, res, next) => {
    const uploadId = getUploadIdFromParams(req.params.uploadId, res);
    if (!uploadId) {
      return;
    }

    const parsed = overrideSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        code: "INVALID_OVERRIDE_PAYLOAD",
        message: "decision and reason (min 10 chars) are required",
        details: parsed.error.issues
      });
    }

    const actor = req.user;
    if (!actor) {
      return res.status(401).json({
        code: "UNAUTHORIZED",
        message: "User context is missing",
        details: []
      });
    }

    try {
      const updated = await uploadRepository.overrideUpload(uploadId, {
        decision: parsed.data.decision,
        reason: parsed.data.reason,
        actor: {
          username: actor.id,
          role: actor.role
        }
      });

      if (!updated) {
        return res.status(404).json({
          code: "UPLOAD_NOT_FOUND",
          message: "Upload was not found",
          details: []
        });
      }

      return res.status(200).json(updated);
    } catch (error) {
      return next(error);
    }
  }
);

uploadsRouter.get(
  "/uploads/:uploadId/report",
  requireAuth,
  requireRole(["loan_officer", "credit_manager", "risk_analyst", "admin", "auditor"]),
  async (req, res, next) => {
    const uploadId = getUploadIdFromParams(req.params.uploadId, res);
    if (!uploadId) {
      return;
    }

    try {
      const record = await uploadRepository.getUpload(uploadId);
      if (!record) {
        return res.status(404).json({
          code: "UPLOAD_NOT_FOUND",
          message: "Upload was not found",
          details: []
        });
      }

      const csv = buildValidationReportCsv(
        record.uploadId,
        record.summary,
        record.errors,
        record.warnings,
        record.recommendation
      );

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=upload-${record.uploadId}-report.csv`);
      return res.status(200).send(csv);
    } catch (error) {
      return next(error);
    }
  }
);
