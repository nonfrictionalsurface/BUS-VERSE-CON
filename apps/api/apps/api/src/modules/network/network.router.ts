import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/require-role.js';
import * as c from './network.controller.js';

const OPERATOR_ROLES = ['OPERATOR_OWNER', 'OPERATOR_MANAGER'];

function isDomainError(
  err: unknown,
): err is { code: string; httpStatus: number; message: string; details?: Record<string, unknown> } {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  return typeof e.code === 'string' && typeof e.httpStatus === 'number' && typeof e.message === 'string';
}
function isZodError(err: unknown): err is { issues: unknown[]; message: string } {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (!Array.isArray(e.issues)) return false;
  const ctor = (err as { constructor?: { name?: string } }).constructor;
  return e.name === 'ZodError' || ctor?.name === 'ZodError';
}

export async function networkRouter(server: FastifyInstance): Promise<void> {
  server.setErrorHandler((error, request, reply) => {
    if (isDomainError(error)) {
      return reply.status(error.httpStatus).send({
        error: {
          code: error.code, message: error.message,
          ...(error.details ? { details: error.details } : {}),
          requestId: request.id,
        },
      });
    }
    if (isZodError(error)) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR', message: 'Validation failed',
          details: { issues: error.issues }, requestId: request.id,
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

  server.get('/public/cities', c.listCities);
  server.get('/public/search', c.searchPublic);
  server.get('/public/schedules/:id', c.getScheduleDetail);

  server.get('/operator/me', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getOperatorMe);
  server.patch('/operator/me', { preHandler: requireRole('OPERATOR_OWNER') }, c.patchOperatorMe);

  server.get('/operator/buses', { preHandler: requireRole(...OPERATOR_ROLES) }, c.listBuses);
  server.post('/operator/buses', { preHandler: requireRole(...OPERATOR_ROLES) }, c.createBus);
  server.get('/operator/buses/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getBus);
  server.patch('/operator/buses/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.patchBus);
  server.delete('/operator/buses/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.deleteBus);

  server.get('/operator/buses/:id/layout', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getSeatLayout);
  server.put('/operator/buses/:id/layout', { preHandler: requireRole(...OPERATOR_ROLES) }, c.putSeatLayout);
}