import { errors } from '../../lib/errors.js';
import { newUuid } from '../../lib/ids.js';
import * as repo from './audit.repository.js';
import {
  AUDIT_EXPORT_MAX_ROWS,
  type AuditLogDTO,
  type AuditLogListDTO,
  type AuditQueryFilters,
  type AuditCursor,
} from './audit.types.js';

function decodeCursor(cursor: string): AuditCursor {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as AuditCursor;
    if (typeof parsed.occurredAt !== 'string' || typeof parsed.id !== 'string') throw new Error('bad shape');
    return parsed;
  } catch {
    throw errors.invalidRequest('Invalid cursor');
  }
}

function encodeCursor(c: { occurredAt: Date; id: string }): string {
  return Buffer.from(JSON.stringify({ occurredAt: c.occurredAt.toISOString(), id: c.id })).toString('base64');
}

function toDTO(row: {
  id: string;
  actorId: string | null;
  sessionId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  reason: string | null;
  ipAddress: string | null;
  metadataJson: unknown;
  occurredAt: Date;
}): AuditLogDTO {
  return {
    id: row.id,
    actorId: row.actorId,
    sessionId: row.sessionId,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    reason: row.reason,
    ipAddress: row.ipAddress,
    metadata: (row.metadataJson as Record<string, unknown>) ?? {},
    occurredAt: row.occurredAt.toISOString(),
  };
}

function filtersToWhere(f: {
  entityType?: string | undefined;
  entityId?: string | undefined;
  actorId?: string | undefined;
  action?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}): AuditQueryFilters {
  const out: AuditQueryFilters = {};
  if (f.entityType) out.entityType = f.entityType;
  if (f.entityId) out.entityId = f.entityId;
  if (f.actorId) out.actorId = f.actorId;
  if (f.action) out.action = f.action;
  if (f.from) out.from = repo.istDayBounds(f.from).from;
  if (f.to) out.to = repo.istDayBounds(f.to).to;
  return out;
}
export async function listAuditLogs(params: {
  entityType?: string | undefined;
  entityId?: string | undefined;
  actorId?: string | undefined;
  action?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  limit: number;
  cursor?: string | undefined;
}): Promise<AuditLogListDTO> {
  const filters = filtersToWhere(params);
  let where = repo.buildWhere(filters);
  if (params.cursor) {
    const cursor = decodeCursor(params.cursor);
    where = repo.combineWhere(where, repo.buildCursorWhere(cursor));
  }

  const rows = await repo.findAuditLogs({ where, limit: params.limit });
  const hasMore = rows.length > params.limit;
  const data = hasMore ? rows.slice(0, params.limit) : rows;
  const nextCursor = hasMore ? encodeCursor(data[data.length - 1]!) : null;

  return { data: data.map(toDTO), nextCursor };
}

function csvEscape(val: string | null | undefined): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const CSV_HEADER = 'id,occurred_at,actor_id,session_id,entity_type,entity_id,action,reason,ip_address,metadata_json';

export async function exportAuditLogsCsv(params: {
  entityType?: string | undefined;
  entityId?: string | undefined;
  actorId?: string | undefined;
  action?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}, opts?: { maxRows?: number }): Promise<{ csv: string; rowCount: number; capped: boolean }> {
  const maxRows = opts?.maxRows ?? AUDIT_EXPORT_MAX_ROWS;
  const filters = filtersToWhere(params);
  const where = repo.buildWhere(filters);

  const total = await repo.countAuditLogs(where);
  const capped = total > maxRows;
  if (total === 0) return { csv: CSV_HEADER + '\n', rowCount: 0, capped: false };

  const rows = await repo.findAuditLogsForExport({ where, maxRows });
  const lines = [CSV_HEADER];
  for (const r of rows) {
    const meta = JSON.stringify(r.metadataJson ?? {});
    lines.push([
      csvEscape(r.id),
      csvEscape(r.occurredAt.toISOString()),
      csvEscape(r.actorId),
      csvEscape(r.sessionId),
      csvEscape(r.entityType),
      csvEscape(r.entityId),
      csvEscape(r.action),
      csvEscape(r.reason),
      csvEscape(r.ipAddress),
      csvEscape(meta),
    ].join(','));
  }
  return { csv: lines.join('\n') + '\n', rowCount: rows.length, capped };
}

export async function queueAuditExport(filters: {
  entityType?: string | undefined;
  entityId?: string | undefined;
  actorId?: string | undefined;
  action?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}): Promise<{ jobId: string }> {
  const { getAuditExportQueue } = await import('../../workers/queue.js');
  const queue = getAuditExportQueue();
  const job = await queue.add('audit-export', { filters }, {
    jobId: 'audit-' + Date.now() + '-' + newUuid(),
  });
  return { jobId: job.id! };
}

export async function getAuditExportStatus(jobId: string): Promise<{
  status: 'pending' | 'ready' | 'failed' | 'not_found';
  rowCount?: number;
  capped?: boolean;
  csv?: string;
  error?: string;
}> {
  const { getAuditExportQueue } = await import('../../workers/queue.js');
  const queue = getAuditExportQueue();
  const job = await queue.getJob(jobId);
  if (!job) return { status: 'not_found' };
  const state = await job.getState();
  if (state === 'completed') {
    const ret = job.returnvalue as { rowCount: number; capped: boolean; csv: string } | undefined;
    if (ret) return { status: 'ready', rowCount: ret.rowCount, capped: ret.capped, csv: ret.csv };
    return { status: 'failed', error: 'no return value' };
  }
  if (state === 'failed') return { status: 'failed', error: job.failedReason ?? 'unknown' };
  return { status: 'pending' };
}