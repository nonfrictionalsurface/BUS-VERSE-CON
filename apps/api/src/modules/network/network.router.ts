import type { FastifyInstance } from 'fastify';
import { requireRole } from '../../middleware/require-role.js';
import * as c from './network.controller.js';

const OPERATOR_ROLES = ['OPERATOR_OWNER', 'OPERATOR_MANAGER'];

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

export async function networkRouter(server: FastifyInstance): Promise<void> {
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

  // public
  server.get('/public/cities', c.listCities);
  server.get('/public/cities/:id/stands', c.listCityStands);
  server.get('/public/search', c.searchPublic);
  server.get('/public/schedules/:id', c.getScheduleDetail);

  // operator me
  server.get('/operator/me', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getOperatorMe);
  server.get('/operator/me/managers', { preHandler: requireRole('OPERATOR_OWNER') }, c.listManagers);
  server.patch('/operator/me', { preHandler: requireRole('OPERATOR_OWNER') }, c.patchOperatorMe);

  // buses
  server.get('/operator/buses', { preHandler: requireRole(...OPERATOR_ROLES) }, c.listBuses);
  server.post('/operator/buses', { preHandler: requireRole(...OPERATOR_ROLES) }, c.createBus);
  server.get('/operator/buses/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getBus);
  server.patch('/operator/buses/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.patchBus);
  server.delete('/operator/buses/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.deleteBus);

  // seat layout
  server.get('/operator/buses/:id/layout', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getSeatLayout);
  server.put('/operator/buses/:id/layout', { preHandler: requireRole(...OPERATOR_ROLES) }, c.putSeatLayout);
  server.post('/operator/buses/:id/layout/validate', { preHandler: requireRole(...OPERATOR_ROLES) }, c.validateSeatLayout);

  // routes
  server.get('/operator/routes', { preHandler: requireRole(...OPERATOR_ROLES) }, c.listRoutes);
  server.post('/operator/routes', { preHandler: requireRole(...OPERATOR_ROLES) }, c.createRoute);
  server.get('/operator/routes/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getRoute);
  server.patch('/operator/routes/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.patchRoute);
  server.post('/operator/routes/:id/stands', { preHandler: requireRole(...OPERATOR_ROLES) }, c.appendRouteStand);
  server.delete('/operator/routes/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.deleteRoute);

  // schedules
  server.get('/operator/schedules', { preHandler: requireRole(...OPERATOR_ROLES) }, c.listSchedules);
  server.post('/operator/schedules', { preHandler: requireRole(...OPERATOR_ROLES) }, c.createSchedule);
  server.get('/operator/schedules/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getSchedule);
  server.patch('/operator/schedules/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.patchSchedule);
  server.post('/operator/schedules/:id/publish', { preHandler: requireRole(...OPERATOR_ROLES) }, c.publishSchedule);

  // drivers (Phase 3c)
  server.get('/operator/drivers', { preHandler: requireRole(...OPERATOR_ROLES) }, c.listDrivers);
  server.post('/operator/drivers/invite', { preHandler: requireRole(...OPERATOR_ROLES) }, c.inviteDriver);
  server.get('/operator/drivers/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getDriver);
  server.delete('/operator/drivers/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.deleteDriver);

  // bookings view (Phase 3c)
  server.get('/operator/bookings', { preHandler: requireRole(...OPERATOR_ROLES) }, c.listBookings);
  server.get('/operator/bookings/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getBooking);

  // dashboard + revenue (Phase 3c)
  server.get('/operator/dashboard', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getDashboard);
  server.get('/operator/revenue', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getRevenue);
  server.get('/operator/revenue/daily', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getRevenueDaily);
  server.get('/operator/settlements', { preHandler: requireRole(...OPERATOR_ROLES) }, c.listSettlements);

  // trips (Phase 13)
  server.post('/operator/trips', { preHandler: requireRole(...OPERATOR_ROLES) }, c.assignTrip);
  server.get('/operator/trips', { preHandler: requireRole(...OPERATOR_ROLES) }, c.listOperatorTrips);
  server.get('/operator/trips/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.getOperatorTrip);
  server.patch('/operator/trips/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.patchOperatorTrip);
  server.delete('/operator/trips/:id', { preHandler: requireRole(...OPERATOR_ROLES) }, c.deleteOperatorTrip);
}