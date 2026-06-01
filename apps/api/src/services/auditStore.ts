/**
 * Module-level in-memory audit event store.
 * Used when the server runs without a database (in-memory persistence mode).
 */

export interface InMemoryAuditEvent {
  id: string;
  actor_user_id: string;
  action_type: string;
  object_type: string;
  object_id: string;
  metadata_json: unknown;
  created_at: Date;
}

const events: InMemoryAuditEvent[] = [];

export function recordAuditEvent(
  actorUserId: string,
  actionType: string,
  objectType: string,
  objectId: string,
  metadata: unknown
): void {
  events.push({
    id: crypto.randomUUID(),
    actor_user_id: actorUserId,
    action_type: actionType,
    object_type: objectType,
    object_id: objectId,
    metadata_json: metadata,
    created_at: new Date()
  });
}

export interface AuditQuery {
  page: number;
  pageSize: number;
  startDate?: string;
  endDate?: string;
  actionType?: string;
  actorUserId?: string;
  objectType?: string;
  objectId?: string;
  metadataSearch?: string;
}

export function queryAuditEvents(q: AuditQuery): {
  items: InMemoryAuditEvent[];
  total: number;
  page: number;
  pageSize: number;
} {
  let filtered = [...events];

  if (q.startDate) {
    const d = new Date(q.startDate);
    filtered = filtered.filter((e) => e.created_at >= d);
  }
  if (q.endDate) {
    const d = new Date(q.endDate);
    filtered = filtered.filter((e) => e.created_at <= d);
  }
  if (q.actionType) {
    filtered = filtered.filter((e) => e.action_type === q.actionType);
  }
  if (q.actorUserId) {
    filtered = filtered.filter((e) => e.actor_user_id === q.actorUserId);
  }
  if (q.objectType) {
    filtered = filtered.filter((e) => e.object_type === q.objectType);
  }
  if (q.objectId) {
    filtered = filtered.filter((e) => e.object_id === q.objectId);
  }
  if (q.metadataSearch) {
    const s = q.metadataSearch.toLowerCase();
    filtered = filtered.filter((e) =>
      JSON.stringify(e.metadata_json).toLowerCase().includes(s)
    );
  }

  // newest first
  filtered.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  const total = filtered.length;
  const offset = (q.page - 1) * q.pageSize;
  const items = filtered.slice(offset, offset + q.pageSize);

  return { items, total, page: q.page, pageSize: q.pageSize };
}

export function getAllAuditEvents(): InMemoryAuditEvent[] {
  return [...events].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
}
