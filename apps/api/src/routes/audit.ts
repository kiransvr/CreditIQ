import { Router } from "express";
import { getDbPool, hasDatabaseConfig } from "../db/client.js";
import { queryAuditEvents, getAllAuditEvents } from "../services/auditStore.js";

const router = Router();

type AuditTimestampColumn = "created_at" | "event_at";

function toQueryString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

function isMissingAuditSchemaError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }

  const maybePgError = err as { code?: string; message?: string };
  const code = maybePgError.code ?? "";
  const message = (maybePgError.message ?? "").toLowerCase();

  // 42P01: undefined_table, 42703: undefined_column
  return code === "42P01" || code === "42703" || message.includes("audit_events");
}

async function resolveAuditTimestampColumn(pool: ReturnType<typeof getDbPool>): Promise<AuditTimestampColumn> {
  const columnResult = await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'audit_events'
       AND column_name IN ('created_at', 'event_at')`
  );

  const names = new Set(columnResult.rows.map((row) => row.column_name));
  if (names.has("created_at")) {
    return "created_at";
  }

  return "event_at";
}

// GET /audit-events: List audit events (basic, paginated)

// Advanced filtering: objectType, objectId, metadataSearch
router.get("/events", async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    startDate,
    endDate,
    actionType,
    actorUserId,
    objectType,
    objectId,
    metadataSearch
  } = req.query;

  // In-memory mode: no database configured
  if (!hasDatabaseConfig()) {
    const result = queryAuditEvents({
      page: Number(page),
      pageSize: Number(pageSize),
      startDate: toQueryString(startDate),
      endDate: toQueryString(endDate),
      actionType: toQueryString(actionType),
      actorUserId: toQueryString(actorUserId),
      objectType: toQueryString(objectType),
      objectId: toQueryString(objectId),
      metadataSearch: toQueryString(metadataSearch)
    });
    res.json(result);
    return;
  }

  const pool = getDbPool();
  try {
    const timestampColumn = await resolveAuditTimestampColumn(pool);
    const offset = (Number(page) - 1) * Number(pageSize);
    const filters: string[] = [];
    const values: Array<string | number | Date> = [Number(pageSize), offset];
    let paramIdx = 3;

    const startDateValue = toQueryString(startDate);
    const endDateValue = toQueryString(endDate);
    const actionTypeValue = toQueryString(actionType);
    const actorUserIdValue = toQueryString(actorUserId);
    const objectTypeValue = toQueryString(objectType);
    const objectIdValue = toQueryString(objectId);
    const metadataSearchValue = toQueryString(metadataSearch);

    if (startDateValue) {
      filters.push(`${timestampColumn} >= $${paramIdx++}`);
      values.push(new Date(startDateValue));
    }
    if (endDateValue) {
      filters.push(`${timestampColumn} <= $${paramIdx++}`);
      values.push(new Date(endDateValue));
    }
    if (actionTypeValue) {
      filters.push(`action_type = $${paramIdx++}`);
      values.push(actionTypeValue);
    }
    if (actorUserIdValue) {
      filters.push(`actor_user_id = $${paramIdx++}`);
      values.push(actorUserIdValue);
    }
    if (objectTypeValue) {
      filters.push(`object_type = $${paramIdx++}`);
      values.push(objectTypeValue);
    }
    if (objectIdValue) {
      filters.push(`object_id = $${paramIdx++}`);
      values.push(objectIdValue);
    }
    if (metadataSearchValue) {
      // Use ILIKE for case-insensitive search in metadata_json::text
      filters.push(`metadata_json::text ILIKE $${paramIdx++}`);
      values.push(`%${metadataSearchValue}%`);
    }

    const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const query = `SELECT id, actor_user_id, action_type, object_type, object_id, metadata_json, ${timestampColumn} AS created_at
      FROM audit_events
      ${where}
      ORDER BY ${timestampColumn} DESC
      LIMIT $1 OFFSET $2`;
    const result = await pool.query(query, values);
    res.json({
      items: result.rows,
      page: Number(page),
      pageSize: Number(pageSize),
      total: result.rows.length // For real total, add COUNT(*) query
    });
  } catch (err: unknown) {
    if (isMissingAuditSchemaError(err)) {
      const fallback = queryAuditEvents({
        page: Number(page),
        pageSize: Number(pageSize),
        startDate: toQueryString(startDate),
        endDate: toQueryString(endDate),
        actionType: toQueryString(actionType),
        actorUserId: toQueryString(actorUserId),
        objectType: toQueryString(objectType),
        objectId: toQueryString(objectId),
        metadataSearch: toQueryString(metadataSearch)
      });

      res.json(fallback);
      return;
    }

    res.status(500).json({
      error: "Failed to fetch audit events",
      details: err instanceof Error ? err.message : "Unknown error"
    });
  }
});


// GET /audit-events/export: Export audit events as CSV
router.get("/events/export", async (req, res) => {
  const header = [
    "id",
    "actor_user_id",
    "action_type",
    "object_type",
    "object_id",
    "metadata_json",
    "created_at"
  ];

  function buildCsv(rows: Array<Record<string, unknown>>): string {
    const csvRows = [
      header.join(","),
      ...rows.map((row) =>
        [
          row["id"],
          row["actor_user_id"],
          row["action_type"],
          row["object_type"],
          row["object_id"],
          JSON.stringify(row["metadata_json"]).replace(/"/g, '""'),
          row["created_at"] instanceof Date
            ? row["created_at"].toISOString()
            : String(row["created_at"])
        ]
          .map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
    ];
    return csvRows.join("\r\n");
  }

  if (!hasDatabaseConfig()) {
    const rows = getAllAuditEvents();
    const csv = buildCsv(rows as unknown as Array<Record<string, unknown>>);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=AuditEvents.csv");
    res.send(csv);
    return;
  }

  const pool = getDbPool();
  try {
    const timestampColumn = await resolveAuditTimestampColumn(pool);
    const result = await pool.query(
      `SELECT id, actor_user_id, action_type, object_type, object_id, metadata_json, ${timestampColumn} AS created_at
       FROM audit_events
       ORDER BY ${timestampColumn} DESC`
    );
    const csv = buildCsv(result.rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=AuditEvents.csv");
    res.send(csv);
  } catch (err: unknown) {
    if (isMissingAuditSchemaError(err)) {
      const rows = getAllAuditEvents();
      const csv = buildCsv(rows as unknown as Array<Record<string, unknown>>);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=AuditEvents.csv");
      res.send(csv);
      return;
    }

    res.status(500).json({
      error: "Failed to export audit events",
      details: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

export default router;
