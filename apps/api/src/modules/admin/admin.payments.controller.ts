import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../lib/response.js';
import * as schema from './admin.schema.js';
import * as svc from './admin.service.js';
import { errors } from '../../lib/errors.js';

function actorFrom(request: FastifyRequest): svc.Actor {
  return {
    userId: request.user!.userId,
    sessionId: request.user!.sessionId,
    ip: request.ip,
  };
}

export async function listPayments(request: FastifyRequest, reply: FastifyReply) {
  const q = schema.listPaymentsQuerySchema.parse(request.query ?? {});
  const rows = await svc.listPaymentsForAdmin({ actor: actorFrom(request), ...q });
  return reply.status(200).send(success(rows));
}

export async function getPayment(request: FastifyRequest, reply: FastifyReply) {
  const { id } = schema.paymentIdParamSchema.parse(request.params);
  const row = await svc.getPaymentForAdmin({ actor: actorFrom(request), paymentId: id });
  return reply.status(200).send(success(row));
}

export async function listRefunds(request: FastifyRequest, reply: FastifyReply) {
  const q = schema.listRefundsQuerySchema.parse(request.query ?? {});
  const rows = await svc.listRefundsForAdmin({ actor: actorFrom(request), ...q });
  return reply.status(200).send(success(rows));
}

export async function refundPayment(request: FastifyRequest, reply: FastifyReply) {
  const { id } = schema.paymentIdParamSchema.parse(request.params);
  const body = schema.refundPaymentBodySchema.parse(request.body ?? {});
  if (!body.reason || body.reason.length < 5) throw errors.reasonRequired();
  const row = await svc.refundPaymentAsAdmin({
    actor: actorFrom(request),
    paymentId: id,
    amountPaise: body.amountPaise,
    reason: body.reason,
    refundReason: body.refundReason,
  });
  return reply.status(201).send(success(row));
}