import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { requireRole } from '../../middleware/require-role.js';
import { success } from '../../lib/response.js';
import * as svc from './payments.service.js';

function isDomainError(err: unknown): err is { code: string; httpStatus: number; message: string; details?: Record<string, unknown> } {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  return typeof e.code === 'string' && typeof e.httpStatus === 'number' && typeof e.message === 'string';
}

const bodySchema = z.object({ paymentId: z.string().uuid() }).strict();

/**
 * Dev-only mock-confirm endpoint. Registered ONLY when NODE_ENV !== 'production'.
 * Runs the full payment.captured transaction so Phase 4 tests exercise the same code
 * path that Phase 5's real Razorpay webhook will use.
 */
export async function devRouter(server: FastifyInstance): Promise<void> {
  if (env.NODE_ENV === 'production') return;

  server.setErrorHandler((error, request, reply) => {
    if (isDomainError(error)) {
      return reply.status(error.httpStatus).send({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}), requestId: request.id } });
    }
    const anyErr = error as { statusCode?: number; code?: string; message?: string };
    const sc = anyErr.statusCode ?? 500;
    return reply.status(sc).send({ error: { code: anyErr.code ?? 'INTERNAL_ERROR', message: anyErr.message ?? 'Unknown error', requestId: request.id } });
  });

  server.post(
    '/dev/mock-confirm-payment',
    { preHandler: requireRole('REGISTERED_PASSENGER') },
    async (request, reply) => {
      const body = bodySchema.parse(request.body ?? {});
      const result = await svc.mockConfirmPayment(body.paymentId, request.user!.userId);
      return reply.status(200).send(success(result));
    },
  );
}