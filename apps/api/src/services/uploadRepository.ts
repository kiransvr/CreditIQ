import type { Pool, PoolClient } from "pg";

import { getDbPool, hasDatabaseConfig } from "../db/client.js";
import { recordAuditEvent } from "./auditStore.js";
import type { RecommendationResult } from "./recommendation.js";
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

interface UploadOverride {
  decision: string;
  reason: string;
  overriddenBy: string;
  overriddenAt: string;
}

interface UploadRecommendation {
  decision: string;
  suggestedAmount: number;
  score: number;
  riskCategory: string;
  reasons: string[];
  customerScores: Array<{
    row: number;
    customerId: string;
    customerName?: string;
    score: number;
    riskCategory: string;
    confidence: number;
    manualReviewRequired: boolean;
    decision: string;
    suggestedAmount: number;
    reasons: string[];
  }>;
  explanation: {
    baseScore: number;
    components: Array<{
      key: string;
      label: string;
      impact: number;
      detail: string;
    }>;
    policyNotes: string[];
    weightedSignals?: Array<{
      key: string;
      label: string;
      weight: number;
      value: number;
      impact: number;
    }>;
    rationaleCategories?: Array<{
      category: string;
      rationale: string;
      impact: number;
    }>;
    scoreTrend?: Array<{
      label: string;
      value: number;
    }>;
    marketAdjustment?: {
      source: "database" | "in_memory_default";
      effectiveFrom: string;
      effectiveTo: string | null;
      inflationPercent: number;
      devaluationPercent: number;
      factor: number;
      rawScore: number;
      adjustedScore: number;
    };
  };
}

interface OverrideInput {
  decision: string;
  reason: string;
  actor: UploadActor;
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
  recommendation: UploadRecommendation;
}

interface UploadDetails extends UploadValidationRecord {
  fileName: string;
  fileType: string;
  institutionId: string;
  templateVersion: string;
  createdBy: string;
  receivedAt: string;
  override: UploadOverride | null;
}

interface DiagnosticsPageQuery {
  page: number;
  pageSize: number;
  filter?: "all" | "errors" | "warnings";
  sort?: "row" | "type" | "code";
  direction?: "asc" | "desc";
  search?: string;
}

interface DiagnosticIssue extends ValidationIssue {
  type: IssueType;
  customerId?: string;
  customerName?: string;
}

interface DiagnosticsPage {
  items: DiagnosticIssue[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UploadRepository {
  createUpload(input: CreateUploadInput): Promise<UploadRecord>;
  validateUpload(
    uploadId: string,
    rows: BorrowerRow[],
    result: ValidationResult,
    recommendation: RecommendationResult
  ): Promise<UploadValidationRecord | null>;
  getUpload(uploadId: string): Promise<UploadDetails | null>;
  getUploadDiagnosticsPage(uploadId: string, query: DiagnosticsPageQuery): Promise<DiagnosticsPage | null>;
  getUploadFileSource(uploadId: string): Promise<UploadFileSource | null>;
  overrideUpload(uploadId: string, input: OverrideInput): Promise<UploadDetails | null>;
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
  override: UploadOverride | null;
  recommendation: UploadRecommendation;
}

function getFirstRowOrThrow<T>(rows: T[], errorMessage: string): T {
  const first = rows[0];
  if (!first) {
    throw new Error(errorMessage);
  }

  return first;
}

type UploadRowRecord = {
  id: string;
  status: UploadStatus;
  file_name: string;
  file_type: string;
  template_version: string;
  uploaded_at: string;
  institution_code: string;
  username: string;
  override_decision: string | null;
  override_reason: string | null;
  overridden_at: string | null;
  overridden_by_username: string | null;
  recommended_decision: string | null;
  recommended_amount: string | null;
  recommendation_reasons: string[] | null;
  recommended_score: number | null;
  recommended_risk_category: string | null;
  recommendation_explanation:
    | {
        baseScore?: number;
        components?: Array<{
          key?: string;
          label?: string;
          impact?: number;
          detail?: string;
        }>;
        policyNotes?: string[];
        weightedSignals?: Array<{
          key?: string;
          label?: string;
          weight?: number;
          value?: number;
          impact?: number;
        }>;
        rationaleCategories?: Array<{
          category?: string;
          rationale?: string;
          impact?: number;
        }>;
        scoreTrend?: Array<{
          label?: string;
          value?: number;
        }>;
        marketAdjustment?: {
          source?: "database" | "in_memory_default";
          effectiveFrom?: string;
          effectiveTo?: string | null;
          inflationPercent?: number;
          devaluationPercent?: number;
          factor?: number;
          rawScore?: number;
          adjustedScore?: number;
        };
        customerScores?: Array<{
          row?: number;
          customerId?: string;
          customerName?: string;
          score?: number;
          riskCategory?: string;
          confidence?: number;
          manualReviewRequired?: boolean;
          decision?: string;
          suggestedAmount?: number;
          reasons?: string[];
        }>;
      }
    | null;
};

type UploadFileRow = {
  file_name: string;
  file_type: string;
  file_content: Buffer | null;
};

class InMemoryUploadRepository implements UploadRepository {
    async getUploadDiagnosticsPage(uploadId: string, query: DiagnosticsPageQuery): Promise<DiagnosticsPage | null> {
      const existing = this.uploads.get(uploadId);
      if (!existing) return null;

      function toText(value: string | number | null | undefined): string | undefined {
        if (value === null || value === undefined) {
          return undefined;
        }

        return String(value);
      }

      // Merge errors and warnings, add type
      let diagnostics: DiagnosticIssue[] = [
        ...existing.errors.map((d): DiagnosticIssue => {
          const row = existing.rows[d.row - 1] ?? {};
          return {
            ...d,
            type: "error",
            customerId: toText(row.customerId ?? row.customer_id),
            customerName: toText(row.customerName ?? row.name ?? row.fullName ?? row.customerId ?? row.customer_id)
          };
        }),
        ...existing.warnings.map((d): DiagnosticIssue => {
          const row = existing.rows[d.row - 1] ?? {};
          return {
            ...d,
            type: "warning",
            customerId: toText(row.customerId ?? row.customer_id),
            customerName: toText(row.customerName ?? row.name ?? row.fullName ?? row.customerId ?? row.customer_id)
          };
        })
      ];

      // Filter
      if (query.filter === "errors") diagnostics = diagnostics.filter((d) => d.type === "error");
      if (query.filter === "warnings") diagnostics = diagnostics.filter((d) => d.type === "warning");

      // Search
      if (query.search) {
        const s = query.search.toLowerCase();
        diagnostics = diagnostics.filter((d) =>
          (d.field?.toLowerCase().includes(s) || d.code?.toLowerCase().includes(s) || d.message?.toLowerCase().includes(s))
        );
      }

      // Sort
      if (query.sort) {
        diagnostics.sort((a, b) => {
          let cmp = 0;
          if (query.sort === "row") cmp = (a.row ?? 0) - (b.row ?? 0);
          else if (query.sort === "type") cmp = (a.type > b.type ? 1 : a.type < b.type ? -1 : 0);
          else if (query.sort === "code") cmp = (a.code > b.code ? 1 : a.code < b.code ? -1 : 0);
          return query.direction === "desc" ? -cmp : cmp;
        });
      }

      const total = diagnostics.length;
      const pageSize = query.pageSize;
      const page = Math.max(1, query.page);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      const items = diagnostics.slice(start, start + pageSize);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages
      };
    }
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
      },
      override: null,
      recommendation: {
        decision: "manual_review",
        suggestedAmount: 0,
        score: 0,
        riskCategory: "very_high",
        reasons: [],
        customerScores: [],
        explanation: {
          baseScore: 0,
          components: [],
          policyNotes: []
        }
      }
    };

    this.uploads.set(uploadId, entity);

    recordAuditEvent(input.actor.username, "upload_created", "upload", uploadId, {
      fileName: input.fileName,
      templateVersion: input.templateVersion
    });

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

  async validateUpload(
    uploadId: string,
    rows: BorrowerRow[],
    result: ValidationResult,
    recommendation: RecommendationResult
  ): Promise<UploadValidationRecord | null> {
    const existing = this.uploads.get(uploadId);
    if (!existing) {
      return null;
    }

    existing.status = "validated";
    existing.rows = rows;
    existing.errors = result.errors;
    existing.warnings = result.warnings;
    existing.summary = result.summary;
    existing.recommendation = {
      decision: recommendation.decision,
      suggestedAmount: recommendation.suggestedAmount,
      score: recommendation.score,
      riskCategory: recommendation.riskCategory,
      reasons: recommendation.reasons,
      customerScores: recommendation.customerScores,
      explanation: recommendation.explanation
    };

    recordAuditEvent(existing.createdBy, "upload_validated", "upload", uploadId, {
      totalRows: result.summary.totalRows,
      errorRows: result.summary.errorRows,
      warningRows: result.summary.warningRows,
      recommendation
    });

    return {
      uploadId,
      status: existing.status,
      summary: existing.summary,
      errors: existing.errors,
      warnings: existing.warnings,
      recommendation: existing.recommendation
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
      receivedAt: existing.receivedAt,
      override: existing.override,
      recommendation: existing.recommendation
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

  async overrideUpload(uploadId: string, input: OverrideInput): Promise<UploadDetails | null> {
    const existing = this.uploads.get(uploadId);
    if (!existing) {
      return null;
    }

    existing.override = {
      decision: input.decision,
      reason: input.reason,
      overriddenBy: input.actor.username,
      overriddenAt: new Date().toISOString()
    };

    recordAuditEvent(input.actor.username, "upload_overridden", "upload", uploadId, {
      decision: input.decision,
      reason: input.reason
    });

    return {
      uploadId,
      status: existing.status,
      summary: existing.summary,
      errors: existing.errors,
      warnings: existing.warnings,
      recommendation: existing.recommendation,
      fileName: existing.fileName,
      fileType: existing.fileType,
      institutionId: existing.institutionId,
      templateVersion: existing.templateVersion,
      createdBy: existing.createdBy,
      receivedAt: existing.receivedAt,
      override: existing.override
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
    async getUploadDiagnosticsPage(uploadId: string, query: DiagnosticsPageQuery): Promise<DiagnosticsPage | null> {
      // Build WHERE clause for filter
      let where = "vi.upload_id = $1";
      const params: any[] = [uploadId];
      let idx = 2;
      if (query.filter === "errors") {
        where += ` AND vi.issue_type = 'error'`;
      } else if (query.filter === "warnings") {
        where += ` AND vi.issue_type = 'warning'`;
      }
      if (query.search) {
        where += ` AND (` +
          `LOWER(vi.field_name) LIKE $${idx} OR LOWER(vi.issue_code) LIKE $${idx} OR LOWER(vi.issue_message) LIKE $${idx} OR ` +
          `LOWER(COALESCE(ur.raw_payload_json->>'customerId', ur.raw_payload_json->>'customer_id', '')) LIKE $${idx} OR ` +
          `LOWER(COALESCE(ur.raw_payload_json->>'customerName', ur.raw_payload_json->>'name', ur.raw_payload_json->>'fullName', '')) LIKE $${idx})`;
        params.push(`%${query.search.toLowerCase()}%`);
        idx++;
      }

      // Sorting
      let orderBy = "vi.row_number ASC";
      if (query.sort === "row") orderBy = `vi.row_number ${query.direction === "desc" ? "DESC" : "ASC"}`;
      else if (query.sort === "type") orderBy = `vi.issue_type ${query.direction === "desc" ? "DESC" : "ASC"}`;
      else if (query.sort === "code") orderBy = `vi.issue_code ${query.direction === "desc" ? "DESC" : "ASC"}`;

      // Count total
      const countResult = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count
         FROM validation_issues vi
         LEFT JOIN upload_rows ur
           ON ur.upload_id = vi.upload_id AND ur.row_number = vi.row_number
         WHERE ${where}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
      const pageSize = query.pageSize;
      const page = Math.max(1, query.page);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const offset = (page - 1) * pageSize;

      // Fetch page
      const issuesResult = await this.pool.query<{
        row_number: number;
        field_name: string;
        issue_code: string;
        issue_message: string;
        issue_type: IssueType;
        customer_id: string | null;
        customer_name: string | null;
      }>(
        `SELECT vi.row_number,
                vi.field_name,
                vi.issue_code,
                vi.issue_message,
                vi.issue_type,
                COALESCE(ur.raw_payload_json->>'customerId', ur.raw_payload_json->>'customer_id') AS customer_id,
                  COALESCE(ur.raw_payload_json->>'customerName', ur.raw_payload_json->>'name', ur.raw_payload_json->>'fullName', ur.raw_payload_json->>'customerId', ur.raw_payload_json->>'customer_id') AS customer_name
         FROM validation_issues vi
         LEFT JOIN upload_rows ur
           ON ur.upload_id = vi.upload_id AND ur.row_number = vi.row_number
         WHERE ${where}
         ORDER BY ${orderBy}
         OFFSET $${idx} LIMIT $${idx + 1}`,
        [...params, offset, pageSize]
      );

      const items = issuesResult.rows.map((issue): DiagnosticIssue => ({
        type: issue.issue_type,
        row: issue.row_number,
        field: issue.field_name,
        code: issue.issue_code,
        message: issue.issue_message,
        customerId: issue.customer_id ?? undefined,
        customerName: issue.customer_name ?? undefined
      }));

      return {
        items,
        total,
        page,
        pageSize,
        totalPages
      };
    }
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
    result: ValidationResult,
    recommendation: RecommendationResult
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

      await client.query(
        `UPDATE uploads
         SET status = 'validated',
             recommended_decision = $2,
             recommended_amount = $3,
             recommendation_reasons = $4::jsonb,
             recommended_score = $5,
             recommended_risk_category = $6,
             recommendation_explanation = $7::jsonb
         WHERE id = $1`,
        [
          uploadId,
          recommendation.decision,
          recommendation.suggestedAmount,
          JSON.stringify(recommendation.reasons),
          recommendation.score,
          recommendation.riskCategory,
          JSON.stringify({
            ...recommendation.explanation,
            customerScores: recommendation.customerScores
          })
        ]
      );

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
            warningRows: result.summary.warningRows,
            recommendation
          })
        ]
      );

      await client.query("COMMIT");

      return {
        uploadId,
        status: "validated",
        summary: result.summary,
        errors: result.errors,
        warnings: result.warnings,
        recommendation: {
          decision: recommendation.decision,
          suggestedAmount: recommendation.suggestedAmount,
          score: recommendation.score,
          riskCategory: recommendation.riskCategory,
          reasons: recommendation.reasons,
          customerScores: recommendation.customerScores,
          explanation: recommendation.explanation
        }
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
      override_decision: string | null;
      override_reason: string | null;
      overridden_at: string | null;
      overridden_by_username: string | null;
      recommended_decision: string | null;
      recommended_amount: string | null;
      recommendation_reasons: string[] | null;
      recommended_score: number | null;
      recommended_risk_category: string | null;
      recommendation_explanation:
        | {
            baseScore?: number;
            components?: Array<{
              key?: string;
              label?: string;
              impact?: number;
              detail?: string;
            }>;
            policyNotes?: string[];
            weightedSignals?: Array<{
              key?: string;
              label?: string;
              weight?: number;
              value?: number;
              impact?: number;
            }>;
            rationaleCategories?: Array<{
              category?: string;
              rationale?: string;
              impact?: number;
            }>;
            scoreTrend?: Array<{
              label?: string;
              value?: number;
            }>;
            marketAdjustment?: {
              source?: "database" | "in_memory_default";
              effectiveFrom?: string;
              effectiveTo?: string | null;
              inflationPercent?: number;
              devaluationPercent?: number;
              factor?: number;
              rawScore?: number;
              adjustedScore?: number;
            };
            customerScores?: Array<{
              row?: number;
              customerId?: string;
              customerName?: string;
              score?: number;
              riskCategory?: string;
              confidence?: number;
              manualReviewRequired?: boolean;
              decision?: string;
              suggestedAmount?: number;
              reasons?: string[];
            }>;
          }
        | null;
    }>(
      `SELECT u.id,
              u.status,
              u.file_name,
              u.file_type,
              u.template_version,
              u.uploaded_at,
              i.institution_code,
              us.username,
              u.override_decision,
              u.override_reason,
              u.overridden_at,
              ous.username AS overridden_by_username,
              u.recommended_decision,
              u.recommended_amount::text,
              COALESCE(u.recommendation_reasons, '[]'::jsonb) AS recommendation_reasons,
              u.recommended_score,
              u.recommended_risk_category,
              COALESCE(u.recommendation_explanation, '{}'::jsonb) AS recommendation_explanation
       FROM uploads u
       INNER JOIN institutions i ON i.id = u.institution_id
       INNER JOIN users us ON us.id = u.uploaded_by
       LEFT JOIN users ous ON ous.id = u.overridden_by
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

    const upload = getFirstRowOrThrow(uploadResult.rows, "Upload record missing after query") as UploadRowRecord;

    return {
      uploadId: upload.id,
      status: upload.status,
      summary,
      errors,
      warnings,
      recommendation: {
        decision: upload.recommended_decision ?? "manual_review",
        suggestedAmount: Number.parseFloat(upload.recommended_amount ?? "0"),
        score: upload.recommended_score ?? 0,
        riskCategory: upload.recommended_risk_category ?? "very_high",
        reasons: upload.recommendation_reasons ?? [],
        customerScores: (upload.recommendation_explanation?.customerScores ?? []).map((item) => ({
          row: item.row ?? 0,
          customerId: item.customerId ?? "",
          customerName: item.customerName,
          score: item.score ?? 0,
          riskCategory: item.riskCategory ?? "very_high",
          confidence: item.confidence ?? 0,
          manualReviewRequired: item.manualReviewRequired ?? true,
          decision: item.decision ?? "manual_review",
          suggestedAmount: item.suggestedAmount ?? 0,
          reasons: item.reasons ?? []
        })),
        explanation: {
          baseScore: upload.recommendation_explanation?.baseScore ?? 0,
          components: (upload.recommendation_explanation?.components ?? []).map((component) => ({
            key: component.key ?? "unknown",
            label: component.label ?? "Unknown",
            impact: component.impact ?? 0,
            detail: component.detail ?? ""
          })),
          policyNotes: upload.recommendation_explanation?.policyNotes ?? [],
          weightedSignals: (upload.recommendation_explanation?.weightedSignals ?? []).map((signal) => ({
            key: signal.key ?? "unknown",
            label: signal.label ?? "Unknown",
            weight: signal.weight ?? 0,
            value: signal.value ?? 0,
            impact: signal.impact ?? 0
          })),
          rationaleCategories: (upload.recommendation_explanation?.rationaleCategories ?? []).map((category) => ({
            category: category.category ?? "unknown",
            rationale: category.rationale ?? "",
            impact: category.impact ?? 0
          })),
          scoreTrend: (upload.recommendation_explanation?.scoreTrend ?? []).map((trend) => ({
            label: trend.label ?? "unknown",
            value: trend.value ?? 0
          })),
          marketAdjustment: upload.recommendation_explanation?.marketAdjustment
            ? {
                source: upload.recommendation_explanation.marketAdjustment.source ?? "in_memory_default",
                effectiveFrom: upload.recommendation_explanation.marketAdjustment.effectiveFrom ?? "",
                effectiveTo: upload.recommendation_explanation.marketAdjustment.effectiveTo ?? null,
                inflationPercent: upload.recommendation_explanation.marketAdjustment.inflationPercent ?? 0,
                devaluationPercent: upload.recommendation_explanation.marketAdjustment.devaluationPercent ?? 0,
                factor: upload.recommendation_explanation.marketAdjustment.factor ?? 1,
                rawScore: upload.recommendation_explanation.marketAdjustment.rawScore ?? 0,
                adjustedScore: upload.recommendation_explanation.marketAdjustment.adjustedScore ?? 0
              }
            : undefined
        }
      },
      fileName: upload.file_name,
      fileType: upload.file_type,
      institutionId: upload.institution_code,
      templateVersion: upload.template_version,
      createdBy: upload.username,
      receivedAt: new Date(upload.uploaded_at).toISOString(),
      override: upload.override_decision && upload.override_reason && upload.overridden_at && upload.overridden_by_username
        ? {
            decision: upload.override_decision,
            reason: upload.override_reason,
            overriddenBy: upload.overridden_by_username,
            overriddenAt: new Date(upload.overridden_at).toISOString()
          }
        : null
    };
  }

  async getUploadFileSource(uploadId: string): Promise<UploadFileSource | null> {
    const result = await this.pool.query<UploadFileRow>(
      `SELECT file_name, file_type, file_content
       FROM uploads
       WHERE id = $1`,
      [uploadId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = getFirstRowOrThrow(result.rows, "Upload file source missing after query") as UploadFileRow;
    if (!row.file_content) {
      throw new Error("Upload file content is missing in storage");
    }

    return {
      fileName: row.file_name,
      fileType: row.file_type,
      fileContent: row.file_content
    };
  }

  async overrideUpload(uploadId: string, input: OverrideInput): Promise<UploadDetails | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const uploadResult = await client.query<{ id: string; institution_id: string }>(
        `SELECT id, institution_id FROM uploads WHERE id = $1`,
        [uploadId]
      );

      if (uploadResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      const uploadRow = getFirstRowOrThrow(uploadResult.rows, "Upload record missing during override");
      const actorUserId = await ensureUser(client, uploadRow.institution_id, input.actor.username, input.actor.role);

      await client.query(
        `UPDATE uploads
         SET override_decision = $2,
             override_reason = $3,
             overridden_by = $4,
             overridden_at = NOW()
         WHERE id = $1`,
        [uploadId, input.decision, input.reason, actorUserId]
      );

      await client.query(
        `INSERT INTO audit_events (id, actor_user_id, action_type, object_type, object_id, metadata_json)
         VALUES ($1, $2, 'upload_overridden', 'upload', $3, $4::jsonb)`,
        [
          crypto.randomUUID(),
          actorUserId,
          uploadId,
          JSON.stringify({ decision: input.decision, reason: input.reason })
        ]
      );

      await client.query("COMMIT");

      return this.getUpload(uploadId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
