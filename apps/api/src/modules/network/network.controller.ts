import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../lib/response.js';
import { errors } from '../../lib/errors.js';
import * as service from './network.service.js';
import { tripIdParamSchema, assignTripBodySchema, reassignTripBodySchema, listOperatorTripsQuerySchema } from './network.schema.js';
import {
  listCitiesQuerySchema, searchQuerySchema, scheduleIdParamSchema, cityIdParamSchema,
  patchOperatorMeSchema, busIdParamSchema, listBusesQuerySchema, createBusSchema, patchBusSchema,
  putSeatLayoutSchema, layoutOptionsQuerySchema, routeIdParamSchema, listRoutesQuerySchema, createRouteSchema,
  patchRouteSchema, appendRouteStandSchema,
  listSchedulesQuerySchema, createScheduleSchema, patchScheduleSchema,
  driverIdParamSchema, listDriversQuerySchema, inviteDriverSchema,
  bookingIdParamSchema, listBookingsQuerySchema, revenueQuerySchema,
} from './network.schema.js';
import type { SeatLayoutBody } from './seat-layout.service.js';

function requireUser(req: FastifyRequest) {
  if (!req.user) throw errors.unauthorized();
  return req.user;
}

// public
export async function listCities(req: FastifyRequest, reply: FastifyReply) {
  const q = listCitiesQuerySchema.parse(req.query);
  return reply.send(success(await service.listCities(q)));
}
export async function listCityStands(req: FastifyRequest, reply: FastifyReply) {
  const { id } = cityIdParamSchema.parse(req.params);
  return reply.send(success(await service.listCityStands(id)));
}
export async function searchPublic(req: FastifyRequest, reply: FastifyReply) {
  const q = searchQuerySchema.parse(req.query);
  return reply.send(success(await service.searchPublic(q)));
}
export async function getScheduleDetail(req: FastifyRequest, reply: FastifyReply) {
  const { id } = scheduleIdParamSchema.parse(req.params);
  return reply.send(success(await service.getScheduleDetail(id)));
}

// operator me
export async function getOperatorMe(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  return reply.send(success(await service.getOperatorMe(user.userId)));
}
export async function patchOperatorMe(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const body = patchOperatorMeSchema.parse(req.body);
  return reply.send(success(await service.patchOperatorMe({ userId: user.userId, ...body })));
}

// buses
export async function listBuses(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const q = listBusesQuerySchema.parse(req.query);
  return reply.send(success(await service.listBuses({ userId: user.userId, status: q.status })));
}
export async function createBus(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const body = createBusSchema.parse(req.body);
  return reply.status(201).send(success(await service.createBus({ userId: user.userId, ...body })));
}
export async function getBus(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = busIdParamSchema.parse(req.params);
  return reply.send(success(await service.getBus({ userId: user.userId, busId: id })));
}
export async function patchBus(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = busIdParamSchema.parse(req.params);
  const body = patchBusSchema.parse(req.body);
  return reply.send(success(await service.patchBus({ userId: user.userId, busId: id, ...body })));
}
export async function deleteBus(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = busIdParamSchema.parse(req.params);
  await service.deleteBus({ userId: user.userId, busId: id });
  return reply.status(204).send();
}

// seat layout
export async function getSeatLayout(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = busIdParamSchema.parse(req.params);
  return reply.send(success(await service.getSeatLayout({ userId: user.userId, busId: id })));
}
/** A body with `v: 2` is the v2 layout document; anything else is the legacy rows/columns body. */
function parseSeatLayoutBody(req: FastifyRequest): SeatLayoutBody {
  const raw = req.body as { v?: unknown } | null | undefined;
  if (raw && typeof raw === 'object' && raw.v === 2) {
    return { kind: 'v2', layout: raw, syncCapacity: layoutOptionsQuerySchema.parse(req.query).syncCapacity };
  }
  return { kind: 'legacy', input: putSeatLayoutSchema.parse(raw) };
}
export async function putSeatLayout(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = busIdParamSchema.parse(req.params);
  return reply.send(success(await service.putSeatLayout({ userId: user.userId, busId: id, body: parseSeatLayoutBody(req) })));
}
export async function validateSeatLayout(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = busIdParamSchema.parse(req.params);
  return reply.send(success(await service.validateSeatLayout({ userId: user.userId, busId: id, body: parseSeatLayoutBody(req) })));
}

// routes
export async function listRoutes(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const q = listRoutesQuerySchema.parse(req.query);
  return reply.send(success(await service.listRoutes({ userId: user.userId, status: q.status })));
}
export async function createRoute(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const body = createRouteSchema.parse(req.body);
  return reply.status(201).send(success(await service.createRoute({ userId: user.userId, ...body })));
}
export async function getRoute(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = routeIdParamSchema.parse(req.params);
  return reply.send(success(await service.getRoute({ userId: user.userId, routeId: id })));
}
export async function patchRoute(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = routeIdParamSchema.parse(req.params);
  const body = patchRouteSchema.parse(req.body);
  return reply.send(success(await service.patchRoute({ userId: user.userId, routeId: id, stands: body.stands })));
}
export async function appendRouteStand(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = routeIdParamSchema.parse(req.params);
  const body = appendRouteStandSchema.parse(req.body);
  return reply.send(success(await service.appendRouteStand({ userId: user.userId, routeId: id, ...body })));
}
export async function deleteRoute(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = routeIdParamSchema.parse(req.params);
  await service.deleteRoute({ userId: user.userId, routeId: id });
  return reply.status(204).send();
}

// schedules
export async function listSchedules(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const q = listSchedulesQuerySchema.parse(req.query);
  return reply.send(success(await service.listSchedules({
    userId: user.userId, status: q.status, busId: q.busId, routeId: q.routeId,
  })));
}
export async function createSchedule(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const body = createScheduleSchema.parse(req.body);
  return reply.status(201).send(success(await service.createSchedule({ userId: user.userId, ...body })));
}
export async function getSchedule(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = scheduleIdParamSchema.parse(req.params);
  return reply.send(success(await service.getSchedule({ userId: user.userId, scheduleId: id })));
}
export async function patchSchedule(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = scheduleIdParamSchema.parse(req.params);
  const body = patchScheduleSchema.parse(req.body);
  return reply.send(success(await service.patchSchedule({ userId: user.userId, scheduleId: id, ...body })));
}
export async function publishSchedule(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = scheduleIdParamSchema.parse(req.params);
  return reply.send(success(await service.publishSchedule({ userId: user.userId, scheduleId: id })));
}
// ============================================================
//  Phase 3c handlers
// ============================================================
export async function listDrivers(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const q = listDriversQuerySchema.parse(req.query);
  return reply.send(success(await service.listDriversForOperator({ userId: user.userId, ...q })));
}
export async function inviteDriver(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const body = inviteDriverSchema.parse(req.body);
  return reply.status(201).send(success(await service.inviteDriver({ userId: user.userId, ...body })));
}
export async function getDriver(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = driverIdParamSchema.parse(req.params);
  return reply.send(success(await service.getDriverForOperator({ userId: user.userId, driverId: id })));
}
export async function deleteDriver(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = driverIdParamSchema.parse(req.params);
  await service.deleteDriverForOperator({ userId: user.userId, driverId: id });
  return reply.status(204).send();
}

export async function listBookings(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const q = listBookingsQuerySchema.parse(req.query);
  const { data, nextCursor } = await service.listBookingsForOperator({
    userId: user.userId, limit: q.limit, cursor: q.cursor,
    status: q.status, scheduleId: q.scheduleId, from: q.from, to: q.to,
  });
  return reply.send({ data, meta: { nextCursor } });
}
export async function getBooking(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = bookingIdParamSchema.parse(req.params);
  return reply.send(success(await service.getBookingForOperator({ userId: user.userId, bookingId: id })));
}

export async function getDashboard(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  return reply.send(success(await service.getDashboard({ userId: user.userId })));
}
export async function getRevenue(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const q = revenueQuerySchema.parse(req.query);
  return reply.send(success(await service.getRevenue({ userId: user.userId, ...q })));
}
export async function getRevenueDaily(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  return reply.send(success(await service.getRevenueDaily({ userId: user.userId })));
}
export async function listSettlements(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const r = await service.listSettlements({ userId: user.userId });
  return reply.send({ data: r.data, meta: { note: r.note } });
}
export async function listManagers(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  return reply.send(success(await service.listManagers({ userId: user.userId })));
}

// ---------- Phase 13: Operator trip assignment ----------
export async function assignTrip(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const body = assignTripBodySchema.parse(req.body);
  return reply.status(201).send(success(await service.assignTrip({ userId: user.userId, ...body })));
}

export async function listOperatorTrips(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const q = listOperatorTripsQuerySchema.parse(req.query);
  const { data, nextCursor } = await service.listOperatorTrips({ userId: user.userId, ...q });
  return reply.send({ data, meta: { nextCursor } });
}

export async function getOperatorTrip(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = tripIdParamSchema.parse(req.params);
  return reply.send(success(await service.getOperatorTrip({ userId: user.userId, tripId: id })));
}

export async function patchOperatorTrip(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = tripIdParamSchema.parse(req.params);
  const body = reassignTripBodySchema.parse(req.body);
  return reply.send(success(await service.reassignTrip({ userId: user.userId, tripId: id, driverId: body.driverId })));
}

export async function deleteOperatorTrip(req: FastifyRequest, reply: FastifyReply) {
  const user = requireUser(req);
  const { id } = tripIdParamSchema.parse(req.params);
  await service.unassignTrip({ userId: user.userId, tripId: id });
  return reply.status(204).send();
}
