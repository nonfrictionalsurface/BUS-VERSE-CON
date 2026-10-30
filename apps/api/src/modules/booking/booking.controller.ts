import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../lib/response.js';
import * as schema from './booking.schema.js';
import * as bookingService from './booking.service.js';
import * as seatLockService from './seat-lock.service.js';

export async function getAvailability(request: FastifyRequest, reply: FastifyReply) {
  const params = schema.scheduleIdParamSchema.parse(request.params);
  const result = await bookingService.getAvailability(request.user!.userId, params.id);
  return reply.status(200).send(success(result));
}

export async function postSeatLock(request: FastifyRequest, reply: FastifyReply) {
  const body = schema.acquireLockSchema.parse(request.body ?? {});
  const result = await seatLockService.acquireSeatLock(request.user!.userId, body);
  return reply.status(201).send(success(result));
}

export async function getActiveLocks(request: FastifyRequest, reply: FastifyReply) {
  const result = await seatLockService.listActiveLocks(request.user!.userId);
  return reply.status(200).send(success(result));
}

export async function deleteSeatLock(request: FastifyRequest, reply: FastifyReply) {
  const params = schema.lockIdParamSchema.parse(request.params);
  await seatLockService.releaseSeatLock(request.user!.userId, params.id);
  return reply.status(204).send();
}
export async function postBooking(request: FastifyRequest, reply: FastifyReply) {
  const body = schema.createBookingSchema.parse(request.body ?? {});
  const result = await bookingService.createBooking(request.user!.userId, body);
  return reply.status(201).send(success(result));
}

export async function getMyBookings(request: FastifyRequest, reply: FastifyReply) {
  const query = schema.listBookingsQuerySchema.parse(request.query ?? {});
  const result = await bookingService.listMyBookings(request.user!.userId, query);
  return reply.status(200).send(success(result.data, { nextCursor: result.nextCursor }));
}

export async function getMyBooking(request: FastifyRequest, reply: FastifyReply) {
  const params = schema.bookingIdParamSchema.parse(request.params);
  const result = await bookingService.getMyBooking(request.user!.userId, params.id);
  return reply.status(200).send(success(result));
}

export async function getBookingTicket(request: FastifyRequest, reply: FastifyReply) {
  const params = schema.bookingIdParamSchema.parse(request.params);
  const result = await bookingService.getTicket(request.user!.userId, params.id);
  return reply.status(200).send(success(result));
}

export async function getRefundPreview(request: FastifyRequest, reply: FastifyReply) {
  const params = schema.bookingIdParamSchema.parse(request.params);
  const result = await bookingService.previewRefund(request.user!.userId, params.id);
  return reply.status(200).send(success(result));
}

export async function postCancelBooking(request: FastifyRequest, reply: FastifyReply) {
  const params = schema.bookingIdParamSchema.parse(request.params);
  const result = await bookingService.cancelBooking(request.user!.userId, params.id);
  return reply.status(200).send(success(result));
}