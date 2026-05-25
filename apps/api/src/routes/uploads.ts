import { Router } from "express";
import multer from "multer";
import { z } from "zod";

import { requireAuth, requireRole } from "../middleware/auth.js";
import { parseBorrowerRowsFromUpload } from "../services/fileParser.js";
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

export const uploadsRouter = Router();
const uploadRepository = getUploadRepository();

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
    const uploadId = req.params.uploadId;
    if (!uploadId) {
      return res.status(400).json({
        code: "INVALID_UPLOAD_ID",
        message: "uploadId is required",
        details: []
      });
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
          rows = parseBorrowerRowsFromUpload(fileSource.fileName, fileSource.fileContent);
        } catch (error) {
          return res.status(400).json({
            code: "UPLOAD_PARSE_FAILED",
            message: error instanceof Error ? error.message : "Unable to parse uploaded file",
            details: []
          });
        }
      }

      const result = validateBorrowerRows(rows);
      const persisted = await uploadRepository.validateUpload(uploadId, rows, result);
      if (!persisted) {
        return res.status(404).json({
          code: "UPLOAD_NOT_FOUND",
          message: "Upload was not found",
          details: []
        });
      }

      return res.status(200).json(persisted);
    } catch (error) {
      return next(error);
    }
  }
);

uploadsRouter.get(
  "/uploads/:uploadId",
  requireAuth,
  requireRole(["loan_officer", "credit_manager", "risk_analyst", "admin", "auditor"]),
  async (req, res, next) => {
    const uploadId = req.params.uploadId;
    if (!uploadId) {
      return res.status(400).json({
        code: "INVALID_UPLOAD_ID",
        message: "uploadId is required",
        details: []
      });
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

      return res.status(200).json(record);
    } catch (error) {
      return next(error);
    }
  }
);
