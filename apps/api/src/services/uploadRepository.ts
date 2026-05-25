import type { Pool, PoolClient } from "pg";

import { getDbPool, hasDatabaseConfig } from "../db/client.js";
import type { BorrowerRow, ValidationIssue, ValidationResult, ValidationSummary } from "./validation.js";

type UploadStatus = "received" | "validating" | "validated" | "failed";

type IssueType = "error" | "warning";

interface UploadActor {
  username: string;
  role: string;
}

interface CreateUploadInput {
  institutionCode: string;
  templateVersion: string;
  fileName: string;
  fileType: string;
  fileContent: Buffer;
  actor: UploadActor;
}

interface UploadFileSource {
  fileName: string;
  fileType: string;
  fileContent: Buffer;
}

interface UploadRecord {
  uploadId: string;
  status: UploadStatus;
  receivedAt: string;
  fileName: string;
  institutionId: string;
  templateVersion: string;
  createdBy: string;
}

interface UploadValidationRecord {
  uploadId: string;
  status: UploadStatus;
  summary: ValidationSummary;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

interface UploadDetails extends UploadValidationRecord {
  fileName: string;
  fileType: string;
  institutionId: string;
  templateVersion: string;
  createdBy: string;
  receivedAt: string;
}

interface UploadRepository {
  createUpload(input: CreateUploadInput): Promise<UploadRecord>;
  validateUpload(uploadId: string, rows: BorrowerRow[], result: ValidationResult): Promise<UploadValidationRecord | null>;
  getUpload(uploadId: string): Promise<UploadDetails | null>;
  getUploadFileSource(uploadId: string): Promise<UploadFileSource | null>;
}

interface UploadMemoryEntity {
  uploadId: string;
  fileName: string;
  fileType: string;
  fileContent: Buffer;
  institutionId: string;
  templateVersion: string;
  createdBy: string;
  status: UploadStatus;
  receivedAt: string;
  rows: BorrowerRow[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: ValidationSummary;
}

function getFirstRowOrThrow<T>(rows: T[], errorMessage: string): T {
  const first = rows[0];
  if (!first) {
    throw new Error(errorMessage);
  }

  return first;
}

class InMemoryUploadRepository implements UploadRepository {
  private readonly uploads = new Map<string, UploadMemoryEntity>();

  async createUpload(input: CreateUploadInput): Promise<UploadRecord> {
    const uploadId = crypto.randomUUID();
    const receivedAt = new Date().toISOString();

    const entity: UploadMemoryEntity = {
      uploadId,
      fileName: input.fileName,
      fileType: input.fileType,
      fileContent: input.fileContent,
      institutionId: input.institutionCode,
      templateVersion: input.templateVersion,
      createdBy: input.actor.username,
      status: "received",
      receivedAt,
      rows: [],
      errors: [],
      warnings: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
        warningRows: 0
      }
    };

    this.uploads.set(uploadId, entity);

    return {
      uploadId,
      status: entity.status,
      receivedAt,
      fileName: entity.fileName,
      institutionId: entity.institutionId,
      templateVersion: entity.templateVersion,
      createdBy: entity.createdBy
    };
  }

  async validateUpload(uploadId: string, rows: BorrowerRow[], result: ValidationResult): Promise<UploadValidationRecord | null> {
    const existing = this.uploads.get(uploadId);
    if (!existing) {
      return null;
    }

    existing.status = "validated";
    existing.rows = rows;
    existing.errors = result.errors;
    existing.warnings = result.warnings;
    existing.summary = result.summary;

    return {
      uploadId,
      status: existing.status,
      summary: existing.summary,
      errors: existing.errors,
      warnings: existing.warnings
    };
  }

  async getUpload(uploadId: string): Promise<UploadDetails | null> {
    const existing = this.uploads.get(uploadId);
    if (!existing) {
      return null;
    }

    return {
      uploadId,
      status: existing.status,
      summary: existing.summary,
      errors: existing.errors,
      warnings: existing.warnings,
      fileName: existing.fileName,
      fileType: existing.fileType,
      institutionId: existing.institutionId,
      templateVersion: existing.templateVersion,
      createdBy: existing.createdBy,
      receivedAt: existing.receivedAt
    };
  }

  async getUploadFileSource(uploadId: string): Promise<UploadFileSource | null> {
    const existing = this.uploads.get(uploadId);
    if (!existing) {
      return null;
    }

    return {
      fileName: existing.fileName,
      fileType: existing.fileType,
      fileContent: existing.fileContent
    };
  }
}

async function ensureInstitution(client: PoolClient, institutionCode: string): Promise<string> {
  const institutionName = institutionCode;
  const result = await client.query<{ id: string }>(
    `INSERT INTO institutions (id, institution_code, institution_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (institution_code)
     DO UPDATE SET institution_name = EXCLUDED.institution_name
     RETURNING id`,
    [crypto.randomUUID(), institutionCode, institutionName]
  );

  const row = getFirstRowOrThrow(result.rows, "Failed to resolve institution id");
  return row.id;
}

async function ensureUser(
  client: PoolClient,
  institutionId: string,
  username: string,
  role: string
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO users (id, institution_id, username, role_code, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (username)
     DO UPDATE SET institution_id = EXCLUDED.institution_id,
                   role_code = EXCLUDED.role_code,
                   is_active = TRUE
     RETURNING id`,
    [crypto.randomUUID(), institutionId, username, role]
  );

  const row = getFirstRowOrThrow(result.rows, "Failed to resolve user id");
  return row.id;
}

function toIssueRows(issues: ValidationIssue[], issueType: IssueType) {
  return issues.map((issue) => ({
    id: crypto.randomUUID(),
    rowNumber: issue.row,
    fieldName: issue.field,
    issueType,
    issueCode: issue.code,
    issueMessage: issue.message
  }));
}

class PostgresUploadRepository implements UploadRepository {
  constructor(private readonly pool: Pool) {}

  async createUpload(input: CreateUploadInput): Promise<UploadRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const institutionId = await ensureInstitution(client, input.institutionCode);
      const createdBy = await ensureUser(client, institutionId, input.actor.username, input.actor.role);

      const uploadId = crypto.randomUUID();
      const insertResult = await client.query<{
        id: string;
        status: UploadStatus;
        uploaded_at: string;
      }>(
        `INSERT INTO uploads (id, institution_id, file_name, file_type, file_content, template_version, status, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'received', $7)
         RETURNING id, status, uploaded_at`,
        [uploadId, institutionId, input.fileName, input.fileType, input.fileContent, input.templateVersion, createdBy]
      );

      await client.query(
        `INSERT INTO audit_events (id, actor_user_id, action_type, object_type, object_id, metadata_json)
         VALUES ($1, $2, 'upload_created', 'upload', $3, $4::jsonb)`,
        [
          crypto.randomUUID(),
          createdBy,
          uploadId,
          JSON.stringify({ fileName: input.fileName, templateVersion: input.templateVersion })
        ]
      );

      await client.query("COMMIT");

      const inserted = getFirstRowOrThrow(insertResult.rows, "Failed to create upload record");

      return {
        uploadId: inserted.id,
        status: inserted.status,
        receivedAt: new Date(inserted.uploaded_at).toISOString(),
        fileName: input.fileName,
        institutionId: input.institutionCode,
        templateVersion: input.templateVersion,
        createdBy: input.actor.username
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async validateUpload(
    uploadId: string,
    rows: BorrowerRow[],
    result: ValidationResult
  ): Promise<UploadValidationRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const uploadResult = await client.query<{ id: string; uploaded_by: string }>(
        `SELECT id, uploaded_by FROM uploads WHERE id = $1`,
        [uploadId]
      );

      if (uploadResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      const uploadRow = getFirstRowOrThrow(uploadResult.rows, "Upload record missing after lookup");
      const actorUserId = uploadRow.uploaded_by;

      await client.query(`UPDATE uploads SET status = 'validating' WHERE id = $1`, [uploadId]);
      await client.query(`DELETE FROM validation_issues WHERE upload_id = $1`, [uploadId]);
      await client.query(`DELETE FROM upload_rows WHERE upload_id = $1`, [uploadId]);

      const errorRows = new Set(result.errors.map((issue) => issue.row));

      for (let index = 0; index < rows.length; index += 1) {
        const rowNumber = index + 1;
        await client.query(
          `INSERT INTO upload_rows (id, upload_id, row_number, raw_payload_json, is_valid)
           VALUES ($1, $2, $3, $4::jsonb, $5)`,
          [crypto.randomUUID(), uploadId, rowNumber, JSON.stringify(rows[index]), !errorRows.has(rowNumber)]
        );
      }

      const issues = [...toIssueRows(result.errors, "error"), ...toIssueRows(result.warnings, "warning")];

      for (const issue of issues) {
        await client.query(
          `INSERT INTO validation_issues (id, upload_id, row_number, field_name, issue_type, issue_code, issue_message)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            issue.id,
            uploadId,
            issue.rowNumber,
            issue.fieldName,
            issue.issueType,
            issue.issueCode,
            issue.issueMessage
          ]
        );
      }

      await client.query(`UPDATE uploads SET status = 'validated' WHERE id = $1`, [uploadId]);

      await client.query(
        `INSERT INTO audit_events (id, actor_user_id, action_type, object_type, object_id, metadata_json)
         VALUES ($1, $2, 'upload_validated', 'upload', $3, $4::jsonb)`,
        [
          crypto.randomUUID(),
          actorUserId,
          uploadId,
          JSON.stringify({
            totalRows: result.summary.totalRows,
            errorRows: result.summary.errorRows,
            warningRows: result.summary.warningRows
          })
        ]
      );

      await client.query("COMMIT");

      return {
        uploadId,
        status: "validated",
        summary: result.summary,
        errors: result.errors,
        warnings: result.warnings
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getUpload(uploadId: string): Promise<UploadDetails | null> {
    const uploadResult = await this.pool.query<{
      id: string;
      status: UploadStatus;
      file_name: string;
      file_type: string;
      template_version: string;
      uploaded_at: string;
      institution_code: string;
      username: string;
    }>(
      `SELECT u.id,
              u.status,
              u.file_name,
              u.file_type,
              u.template_version,
              u.uploaded_at,
              i.institution_code,
              us.username
       FROM uploads u
       INNER JOIN institutions i ON i.id = u.institution_id
       INNER JOIN users us ON us.id = u.uploaded_by
       WHERE u.id = $1`,
      [uploadId]
    );

    if (uploadResult.rowCount === 0) {
      return null;
    }

    const summaryResult = await this.pool.query<{
      total_rows: string;
      valid_rows: string;
      error_rows: string;
      warning_rows: string;
    }>(
      `SELECT
         COUNT(ur.id)::text AS total_rows,
         COUNT(ur.id) FILTER (WHERE ur.is_valid)::text AS valid_rows,
         COUNT(DISTINCT vi.row_number) FILTER (WHERE vi.issue_type = 'error')::text AS error_rows,
         COUNT(DISTINCT vi.row_number) FILTER (WHERE vi.issue_type = 'warning')::text AS warning_rows
       FROM uploads u
       LEFT JOIN upload_rows ur ON ur.upload_id = u.id
       LEFT JOIN validation_issues vi ON vi.upload_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [uploadId]
    );

    const issuesResult = await this.pool.query<{
      row_number: number;
      field_name: string;
      issue_code: string;
      issue_message: string;
      issue_type: IssueType;
    }>(
      `SELECT row_number, field_name, issue_code, issue_message, issue_type
       FROM validation_issues
       WHERE upload_id = $1
       ORDER BY row_number ASC`,
      [uploadId]
    );

    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    for (const issue of issuesResult.rows) {
      const mapped: ValidationIssue = {
        row: issue.row_number,
        field: issue.field_name,
        code: issue.issue_code,
        message: issue.issue_message
      };

      if (issue.issue_type === "error") {
        errors.push(mapped);
      } else {
        warnings.push(mapped);
      }
    }

    const summaryRow = summaryResult.rows[0] ?? {
      total_rows: "0",
      valid_rows: "0",
      error_rows: "0",
      warning_rows: "0"
    };

    const summary: ValidationSummary = {
      totalRows: Number.parseInt(summaryRow.total_rows, 10),
      validRows: Number.parseInt(summaryRow.valid_rows, 10),
      errorRows: Number.parseInt(summaryRow.error_rows, 10),
      warningRows: Number.parseInt(summaryRow.warning_rows, 10)
    };

    const upload = getFirstRowOrThrow(uploadResult.rows, "Upload record missing after query");

    return {
      uploadId: upload.id,
      status: upload.status,
      summary,
      errors,
      warnings,
      fileName: upload.file_name,
      fileType: upload.file_type,
      institutionId: upload.institution_code,
      templateVersion: upload.template_version,
      createdBy: upload.username,
      receivedAt: new Date(upload.uploaded_at).toISOString()
    };
  }

  async getUploadFileSource(uploadId: string): Promise<UploadFileSource | null> {
    const result = await this.pool.query<{
      file_name: string;
      file_type: string;
      file_content: Buffer | null;
    }>(
      `SELECT file_name, file_type, file_content
       FROM uploads
       WHERE id = $1`,
      [uploadId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = getFirstRowOrThrow(result.rows, "Upload file source missing after query");
    if (!row.file_content) {
      throw new Error("Upload file content is missing in storage");
    }

    return {
      fileName: row.file_name,
      fileType: row.file_type,
      fileContent: row.file_content
    };
  }
}

let repo: UploadRepository | null = null;

export function getUploadRepository(): UploadRepository {
  if (!repo) {
    repo = hasDatabaseConfig()
      ? new PostgresUploadRepository(getDbPool())
      : new InMemoryUploadRepository();
  }

  return repo;
}
