import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/require-role.js';
import * as c from './booking.controller.js';
import * as lc from './booking.live.controller.js';

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

export async function bookingRouter(server: FastifyInstance): Promise<void> {
  server.setErrorHandler((error, request, reply) => {
    if (isDomainError(error)) {
      return reply.status(error.httpStatus).send({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}), requestId: request.id } });
    }
    if (isZodError(error)) {
      return reply.status(422).send({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: { issues: error.issues }, requestId: request.id } });
    }
    const anyErr = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = anyErr.statusCode ?? 500;
    const isProd = process.env.NODE_ENV === 'production';
    return reply.status(statusCode).send({ error: { code: anyErr.code ?? 'INTERNAL_ERROR', message: isProd ? 'Something went wrong' : (anyErr.message ?? 'Unknown error'), requestId: request.id } });
  });

  const auth = { preHandler: requireRole('REGISTERED_PASSENGER') };

  server.get('/passenger/schedules/:id/availability', auth, c.getAvailability);
  server.post('/passenger/seat-locks', auth, c.postSeatLock);
  server.get('/passenger/seat-locks/active', auth, c.getActiveLocks);
  server.delete('/passenger/seat-locks/:id', auth, c.deleteSeatLock);
  server.post('/passenger/bookings', auth, c.postBooking);
  server.get('/passenger/bookings', auth, c.getMyBookings);
  server.get('/passenger/bookings/:id', auth, c.getMyBooking);
  server.get('/passenger/bookings/:id/ticket', auth, c.getBookingTicket);
  server.get('/passenger/bookings/:id/refund-preview', auth, c.getRefundPreview);
  server.post('/passenger/bookings/:id/cancel', auth, c.postCancelBooking);
  server.get('/passenger/trips/:id/live', auth, lc.getLive);
  server.get('/passenger/trips/:id/map', auth, lc.getMap);
}