import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../lib/response.js';
import * as schema from './payments.schema.js';
import * as svc from './payments.service.js';
import { errors } from '../../lib/errors.js';

export async function postPayment(request: FastifyRequest, reply: FastifyReply) {
  const idempotencyKey = request.headers['idempotency-key'];
  if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8) {
    throw errors.invalidRequest('Idempotency-Key header required (min 8 chars)');
  }
  const body = schema.initiatePaymentBodySchema.parse(request.body ?? {});
  const result = await svc.initiatePayment(request.user!.userId, body, idempotencyKey);
  return reply.status(201).send(success(result));
}

export async function getPaymentStatusHandler(request: FastifyRequest, reply: FastifyReply) {
  const params = schema.paymentIdParamSchema.parse(request.params);
  const result = await svc.getPaymentStatus(request.user!.userId, params.id);
  return reply.status(200).send(success(result));
}