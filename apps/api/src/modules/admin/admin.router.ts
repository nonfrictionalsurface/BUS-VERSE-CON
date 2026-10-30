import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/require-role.js';
import * as c from './admin.controller.js';
import * as apc from './admin.payments.controller.js';

function isDomainError(err: unknown): err is { code: string; httpStatus: number; message: string; details?: Record<string, unknown> } {
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

export async function adminRouter(server: FastifyInstance): Promise<void> {
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
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: { issues: error.issues }, requestId: request.id },
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

  // Operators (5)
  server.get('/admin/operators', { preHandler: requireRole('SUPER_ADMIN') }, c.listOperators);
  server.get('/admin/operators/:id', { preHandler: requireRole('SUPER_ADMIN') }, c.getOperator);
  server.post('/admin/operators/:id/approve', { preHandler: requireRole('SUPER_ADMIN') }, c.approveOperator);
  server.post('/admin/operators/:id/reject', { preHandler: requireRole('SUPER_ADMIN') }, c.rejectOperator);
  server.post('/admin/operators/:id/suspend', { preHandler: requireRole('SUPER_ADMIN') }, c.suspendOperator);

  // Buses (3)
  server.get('/admin/buses', { preHandler: requireRole('SUPER_ADMIN') }, c.listBuses);
  server.post('/admin/buses/:id/approve', { preHandler: requireRole('SUPER_ADMIN') }, c.approveBus);
  server.post('/admin/buses/:id/reject', { preHandler: requireRole('SUPER_ADMIN') }, c.rejectBus);

  // Routes (2) — list endpoint added beyond 07 §6.2 catalog; 07 to v1.4
  server.get('/admin/routes', { preHandler: requireRole('SUPER_ADMIN') }, c.listRoutes);
  server.post('/admin/routes/:id/approve', { preHandler: requireRole('SUPER_ADMIN') }, c.approveRoute);

  // Schedules (2) — list endpoint added beyond 07 §6.2 catalog; 07 to v1.4
  server.get('/admin/schedules', { preHandler: requireRole('SUPER_ADMIN') }, c.listSchedules);
  server.post('/admin/schedules/:id/approve', { preHandler: requireRole('SUPER_ADMIN') }, c.approveSchedule);

  // Oversight (3)
  server.get('/admin/bookings', { preHandler: requireRole('SUPER_ADMIN') }, c.listBookings);
  server.get('/admin/bookings/:id', { preHandler: requireRole('SUPER_ADMIN') }, c.getBooking);
  server.get('/admin/dashboard', { preHandler: requireRole('SUPER_ADMIN') }, c.getDashboard);

  // Payments oversight (Phase 5)
  server.get('/admin/payments', { preHandler: requireRole('SUPER_ADMIN') }, apc.listPayments);
  server.get('/admin/payments/:id', { preHandler: requireRole('SUPER_ADMIN') }, apc.getPayment);
  server.post('/admin/payments/:id/refund', { preHandler: requireRole('SUPER_ADMIN') }, apc.refundPayment);
  server.get('/admin/refunds', { preHandler: requireRole('SUPER_ADMIN') }, apc.listRefunds);
}