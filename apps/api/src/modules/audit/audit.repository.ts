import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';
import type { AuditQueryFilters, AuditCursor } from './audit.types.js';

// IST day bounds (per B1 decision)
export function istDayBounds(dateStr: string): { from: Date; to: Date } {
  return {
    from: new Date(`${dateStr}T00:00:00.000+05:30`),
    to: new Date(`${dateStr}T23:59:59.999+05:30`),
  };
}

export function buildWhere(filters: AuditQueryFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.actorId) where.actorId = filters.actorId;
  if (filters.action) where.action = filters.action;
  if (filters.from || filters.to) {
    where.occurredAt = {};
    if (filters.from) where.occurredAt.gte = filters.from;
    if (filters.to) where.occurredAt.lte = filters.to;
  }
  return where;
}

// Cursor-based: (occurredAt, id) < (cursor.occurredAt, cursor.id)
export function buildCursorWhere(cursor: AuditCursor): Prisma.AuditLogWhereInput {
  const cursorDate = new Date(cursor.occurredAt);
  return {
    OR: [
      { occurredAt: { lt: cursorDate } },
      { AND: [{ occurredAt: cursorDate }, { id: { lt: cursor.id } }] },
    ],
  };
}

export function combineWhere(a: Prisma.AuditLogWhereInput, b: Prisma.AuditLogWhereInput): Prisma.AuditLogWhereInput {
  if (Object.keys(a).length === 0) return b;
  if (Object.keys(b).length === 0) return a;
  return { AND: [a, b] };
}
export async function findAuditLogs(params: {
  where: Prisma.AuditLogWhereInput;
  limit: number;
}): Promise<Array<{
  id: string;
  actorId: string | null;
  sessionId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  reason: string | null;
  ipAddress: string | null;
  metadataJson: Prisma.JsonValue;
  occurredAt: Date;
}>> {
  return prisma.auditLog.findMany({
    where: params.where,
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: params.limit + 1,
  });
}

export async function countAuditLogs(where: Prisma.AuditLogWhereInput): Promise<number> {
  return prisma.auditLog.count({ where });
}

export async function findAuditLogsForExport(params: {
  where: Prisma.AuditLogWhereInput;
  maxRows: number;
}): Promise<Array<{
  id: string;
  actorId: string | null;
  sessionId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  reason: string | null;
  ipAddress: string | null;
  metadataJson: Prisma.JsonValue;
  occurredAt: Date;
}>> {
  return prisma.auditLog.findMany({
    where: params.where,
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: params.maxRows,
  });
}