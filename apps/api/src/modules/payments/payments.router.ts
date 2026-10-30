import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/require-role.js';
import * as c from './payments.controller.js';

function isDomainError(err: unknown): err is { code: string; httpStatus: number; message: string; details?: Record<string, unknown> } {
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

export async function paymentsRouter(server: FastifyInstance): Promise<void> {
  server.setErrorHandler((error, request, reply) => {
    if (isDomainError(error)) {
      return reply.status(error.httpStatus).send({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}), requestId: request.id } });
    }
    if (isZodError(error)) {
      return reply.status(422).send({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: { issues: error.issues }, requestId: request.id } });
    }
    const anyErr = error as { statusCode?: number; code?: string; message?: string };
    const sc = anyErr.statusCode ?? 500;
    const isProd = process.env.NODE_ENV === 'production';
    return reply.status(sc).send({ error: { code: anyErr.code ?? 'INTERNAL_ERROR', message: isProd ? 'Something went wrong' : (anyErr.message ?? 'Unknown error'), requestId: request.id } });
  });

  const auth = { preHandler: requireRole('REGISTERED_PASSENGER') };
  server.post('/passenger/payments', auth, c.postPayment);
  server.get('/passenger/payments/:id', auth, c.getPaymentStatusHandler);
}