// Audit module — DTOs and filter types. No runtime imports.

export interface AuditLogDTO {
  id: string;
  actorId: string | null;
  sessionId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  reason: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export interface AuditLogListDTO {
  data: AuditLogDTO[];
  nextCursor: string | null;
}

export interface AuditQueryFilters {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export interface AuditCursor {
  occurredAt: string;
  id: string;
}

// Per 09 §15 + buscon/01 §12.6
export const AUDIT_EXPORT_MAX_ROWS = 10_000;
export const AUDIT_LIST_DEFAULT_LIMIT = 50;
export const AUDIT_LIST_MAX_LIMIT = 200;