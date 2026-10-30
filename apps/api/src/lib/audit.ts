import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

/**
 * Write an append-only audit row. Called from every admin action and every
 * PII unmask. Phase 7 will expand this file with query/export functions
 * but the writeAuditEvent signature is locked.
 *
 * Returns the created audit_logs.id so callers can include it in their
 * response (e.g. GET /admin/bookings/:id?includePii=true returns auditLogId
 * so the client knows which audit entry recorded the unmask).
 */
export async function writeAuditEvent(params: {
  actorId: string | null;
  sessionId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  reason?: string | null | undefined;
  ipAddress?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
  tx?: Prisma.TransactionClient | undefined;
}): Promise<string> {
  const client = params.tx ?? prisma;
  const row = await client.auditLog.create({
    data: {
      actorId: params.actorId,
      sessionId: params.sessionId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      reason: params.reason ?? null,
      ipAddress: params.ipAddress ?? null,
      metadataJson: { _v: 1, ...(params.metadata ?? {}) },
    },
  });
  return row.id;
}