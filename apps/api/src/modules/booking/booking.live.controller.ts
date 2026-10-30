import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { success } from '../../lib/response.js';
import * as svc from './booking.live.service.js';

const tripIdParamSchema = z.object({ id: z.string().uuid() });

export async function getLive(request: FastifyRequest, reply: FastifyReply) {
  const { id } = tripIdParamSchema.parse(request.params);
  const row = await svc.getLiveTrip(request.user!.userId, id);
  return reply.status(200).send(success(row));
}

export async function getMap(request: FastifyRequest, reply: FastifyReply) {
  const { id } = tripIdParamSchema.parse(request.params);
  const row = await svc.getMap(request.user!.userId, id);
  return reply.status(200).send(success(row));
}