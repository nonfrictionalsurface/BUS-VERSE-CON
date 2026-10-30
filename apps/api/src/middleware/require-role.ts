import type { FastifyReply, FastifyRequest } from 'fastify';
import { errors } from '../lib/errors.js';

export function requireRole(...allowed: string[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.user) throw errors.unauthorized();
    if (!allowed.includes(request.user.role)) throw errors.forbidden();
  };
}