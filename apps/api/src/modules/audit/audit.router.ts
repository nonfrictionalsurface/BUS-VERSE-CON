import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/require-role.js';
import * as c from './audit.controller.js';

function isDomainError(
  err: unknown,
): err is { code: string; httpStatus: number; message: string; details?: Record<string, unknown> } {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  return typeof e.code === 'string' && typeof e.httpStatus === 'number' && typeof e.message === 'string';
}

function isZodError(err: unknown): err is { issues: unknown[] } {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (!Array.isArray(e.issues)) return false;
  const ctor = (err as { constructor?: { name?: string } }).constructor;
  return (err as { name?: string }).name === 'ZodError' || ctor?.name === 'ZodError';
}

export async function auditRouter(server: FastifyInstance): Promise<void> {
  server.setErrorHandler((error, request, reply) => {
    if (isDomainError(error)) {
      return reply.status(error.httpStatus).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
          requestId: request.id,
        },
      });
    }
    if (isZodError(error)) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { issues: error.issues },
          requestId: request.id,
        },
      });
    }
    const anyErr = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = anyErr.statusCode ?? 500;
    const isProd = process.env.NODE_ENV === 'production';
    return reply.status(statusCode).send({
      error: {
        code: anyErr.code ?? 'INTERNAL_ERROR',
        message: isProd ? 'Something went wrong' : (anyErr.message ?? 'Unknown error'),
        requestId: request.id,
      },
    });
  });

  const auth = { preHandler: requireRole('SUPER_ADMIN') };

  server.get('/admin/audit-logs', auth, c.getAuditLogs);
  server.get('/admin/audit-logs/export', auth, c.getAuditLogsExport);
  server.post('/admin/audit-logs/export-async', auth, c.postAuditLogsExportAsync);
  server.get('/admin/audit-logs/export-async/:jobId', auth, c.getAuditLogsExportStatus);
}