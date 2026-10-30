import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../lib/response.js';
import { errors } from '../../lib/errors.js';
import * as service from './admin.service.js';
import {
  operatorIdParamSchema, busIdParamSchema, routeIdParamSchema, scheduleIdParamSchema, bookingIdParamSchema,
  listOperatorsQuerySchema, listBusesQuerySchema, listRoutesQuerySchema, listSchedulesQuerySchema,
  listBookingsQuerySchema, getBookingQuerySchema, actionReasonSchema,
} from './admin.schema.js';

function requireAdmin(req: FastifyRequest) {
  if (!req.user) throw errors.unauthorized();
  return { userId: req.user.userId, sessionId: req.user.sessionId, ip: req.ip };
}

// ---------- Operators ----------
export async function listOperators(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const q = listOperatorsQuerySchema.parse(req.query);
  return reply.send(success(await service.listOperatorsForAdmin({ actor, status: q.status, limit: q.limit })));
}
export async function getOperator(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const { id } = operatorIdParamSchema.parse(req.params);
  return reply.send(success(await service.getOperatorForAdmin({ actor, operatorId: id })));
}
export async function approveOperator(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const { id } = operatorIdParamSchema.parse(req.params);
  const { reason } = actionReasonSchema.parse(req.body);
  return reply.send(success(await service.approveOperator({ actor, operatorId: id, reason })));
}
export async function rejectOperator(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const { id } = operatorIdParamSchema.parse(req.params);
  const { reason } = actionReasonSchema.parse(req.body);
  return reply.send(success(await service.rejectOperator({ actor, operatorId: id, reason })));
}
export async function suspendOperator(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const { id } = operatorIdParamSchema.parse(req.params);
  const { reason } = actionReasonSchema.parse(req.body);
  return reply.send(success(await service.suspendOperator({ actor, operatorId: id, reason })));
}

// ---------- Buses ----------
export async function listBuses(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const q = listBusesQuerySchema.parse(req.query);
  return reply.send(success(await service.listBusesForAdmin({ actor, status: q.status, operatorId: q.operatorId, limit: q.limit })));
}
export async function approveBus(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const { id } = busIdParamSchema.parse(req.params);
  const { reason } = actionReasonSchema.parse(req.body);
  return reply.send(success(await service.approveBus({ actor, busId: id, reason })));
}
export async function rejectBus(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const { id } = busIdParamSchema.parse(req.params);
  const { reason } = actionReasonSchema.parse(req.body);
  return reply.send(success(await service.rejectBus({ actor, busId: id, reason })));
}

// ---------- Routes ----------
export async function listRoutes(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const q = listRoutesQuerySchema.parse(req.query);
  return reply.send(success(await service.listRoutesForAdmin({ actor, status: q.status, operatorId: q.operatorId, limit: q.limit })));
}
export async function approveRoute(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const { id } = routeIdParamSchema.parse(req.params);
  const { reason } = actionReasonSchema.parse(req.body);
  return reply.send(success(await service.approveRoute({ actor, routeId: id, reason })));
}

// ---------- Schedules ----------
export async function listSchedules(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const q = listSchedulesQuerySchema.parse(req.query);
  return reply.send(success(await service.listSchedulesForAdmin({ actor, status: q.status, operatorId: q.operatorId, limit: q.limit })));
}
export async function approveSchedule(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const { id } = scheduleIdParamSchema.parse(req.params);
  const { reason } = actionReasonSchema.parse(req.body);
  return reply.send(success(await service.approveSchedule({ actor, scheduleId: id, reason })));
}

// ---------- Oversight ----------
export async function listBookings(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const q = listBookingsQuerySchema.parse(req.query);
  return reply.send(success(await service.listBookingsForAdmin({
    actor, status: q.status, userId: q.userId, scheduleId: q.scheduleId,
    operatorId: q.operatorId, from: q.from, to: q.to, limit: q.limit,
  })));
}
export async function getBooking(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  const { id } = bookingIdParamSchema.parse(req.params);
  const q = getBookingQuerySchema.parse(req.query);
  const includePii = q.includePii === 'true';
  return reply.send(success(await service.getBookingForAdmin({
    actor, bookingId: id, includePii, reason: q.reason,
  })));
}
export async function getDashboard(req: FastifyRequest, reply: FastifyReply) {
  const actor = requireAdmin(req);
  return reply.send(success(await service.getAdminDashboard({ actor })));
}