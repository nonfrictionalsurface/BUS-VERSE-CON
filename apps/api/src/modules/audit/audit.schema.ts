import { z } from 'zod';
import { AUDIT_LIST_DEFAULT_LIMIT, AUDIT_LIST_MAX_LIMIT } from './audit.types.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const auditListQuerySchema = z.object({
  entityType: z.string().min(1).max(50).optional(),
  entityId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  action: z.string().min(1).max(50).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(AUDIT_LIST_MAX_LIMIT).default(AUDIT_LIST_DEFAULT_LIMIT),
  cursor: z.string().optional(),
});

export const auditExportQuerySchema = z.object({
  entityType: z.string().min(1).max(50).optional(),
  entityId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  action: z.string().min(1).max(50).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  format: z.enum(['csv']).default('csv'),
});