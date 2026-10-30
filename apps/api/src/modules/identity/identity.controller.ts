import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../lib/response.js';
import { errors } from '../../lib/errors.js';
import * as service from './identity.service.js';
import * as schema from './identity.schema.js';
import {
  passengerOtpRequestSchema,
  passengerOtpVerifySchema,
  driverOtpRequestSchema,
  driverOtpVerifySchema,
  operatorOtpRequestSchema,
  operatorOtpVerifySchema,
  operatorLoginSchema,
  adminLoginSchema,
  passwordResetRequestSchema,
  operatorPasswordResetVerifySchema,
  adminPasswordResetVerifySchema,
  refreshSchema,
  surfaceParamSchema,
} from './identity.schema.js';
import { redis, keys } from '../../lib/redis.js';
import { verifyAccessToken } from './jwt.service.js';

function ctx(req: FastifyRequest) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'] ?? undefined,
  };
}

function extractRefreshToken(req: FastifyRequest): string {
  const body = req.body as { refreshToken?: string } | undefined;
  if (body && typeof body.refreshToken === 'string') return body.refreshToken;

  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();

  throw errors.unauthorized('Missing refresh token');
}

export async function postPassengerOtpRequest(req: FastifyRequest, reply: FastifyReply) {
  const body = passengerOtpRequestSchema.parse(req.body);
  const result = await service.passengerOtpRequest({ ...body, ip: req.ip });
  return reply.send(success(result));
}

export async function postPassengerOtpVerify(req: FastifyRequest, reply: FastifyReply) {
  const body = passengerOtpVerifySchema.parse(req.body);
  const result = await service.passengerOtpVerify({ ...body, ...ctx(req) });
  return reply.send(success(result));
}

export async function postDriverOtpRequest(req: FastifyRequest, reply: FastifyReply) {
  const body = driverOtpRequestSchema.parse(req.body);
  const result = await service.driverOtpRequest({ ...body, ip: req.ip });
  return reply.send(success(result));
}

export async function postDriverOtpVerify(req: FastifyRequest, reply: FastifyReply) {
  const body = driverOtpVerifySchema.parse(req.body);
  const result = await service.driverOtpVerify({ ...body, ...ctx(req) });
  return reply.send(success(result));
}

export async function postOperatorOtpRequest(req: FastifyRequest, reply: FastifyReply) {
  const body = operatorOtpRequestSchema.parse(req.body);
  const result = await service.operatorOtpRequest({ ...body, ip: req.ip });
  return reply.send(success(result));
}

export async function postOperatorOtpVerify(req: FastifyRequest, reply: FastifyReply) {
  const body = operatorOtpVerifySchema.parse(req.body);
  const result = await service.operatorOtpVerify({ ...body, ...ctx(req) });
  return reply.send(success(result));
}

export async function postOperatorLogin(req: FastifyRequest, reply: FastifyReply) {
  const body = operatorLoginSchema.parse(req.body);
  const result = await service.operatorLogin({ ...body, ...ctx(req) });
  return reply.send(success(result));
}

export async function postAdminLogin(req: FastifyRequest, reply: FastifyReply) {
  const body = adminLoginSchema.parse(req.body);
  const result = await service.adminLogin({ ...body, ...ctx(req) });
  return reply.send(success(result));
}

export async function postOperatorResetRequest(req: FastifyRequest, reply: FastifyReply) {
  const body = passwordResetRequestSchema.parse(req.body);
  const result = await service.passwordResetRequest(body, 'operator');
  return reply.send(success(result));
}

export async function postOperatorResetVerify(req: FastifyRequest, reply: FastifyReply) {
  const body = operatorPasswordResetVerifySchema.parse(req.body);
  const result = await service.passwordResetVerifyOperator(body);
  return reply.send(success(result));
}

export async function postAdminResetRequest(req: FastifyRequest, reply: FastifyReply) {
  const body = passwordResetRequestSchema.parse(req.body);
  const result = await service.passwordResetRequest(body, 'admin');
  return reply.send(success(result));
}

export async function postAdminResetVerify(req: FastifyRequest, reply: FastifyReply) {
  const body = adminPasswordResetVerifySchema.parse(req.body);
  const result = await service.passwordResetVerifyAdmin(body);
  return reply.send(success(result));
}

export async function postRefresh(req: FastifyRequest, reply: FastifyReply) {
  surfaceParamSchema.parse(req.params);
  refreshSchema.parse(req.body ?? {});
  const refreshToken = extractRefreshToken(req);
  const result = await service.refreshSession(refreshToken);
  return reply.send(success(result));
}

export async function postLogout(req: FastifyRequest, reply: FastifyReply) {
  surfaceParamSchema.parse(req.params);
  if (!req.user) throw errors.unauthorized();

  const header = req.headers.authorization;
  let ttlSeconds = 300;
  if (header && header.startsWith('Bearer ')) {
    try {
      const claims = verifyAccessToken(header.slice(7));
      ttlSeconds = Math.max(1, claims.exp - Math.floor(Date.now() / 1000));
    } catch {
      /* ignore */
    }
  }

  await service.logout(req.user.sessionId, req.user.userId);
  await redis.set(keys.revokedSession(req.user.sessionId), '1', 'EX', ttlSeconds);

  return reply.status(204).send();
}
export async function postOperatorSignup(request: FastifyRequest, reply: FastifyReply) {
  const body = schema.operatorSignupSchema.parse(request.body ?? {});
  const xff = request.headers['x-forwarded-for'];
  const ip = typeof xff === 'string' ? xff.split(',')[0]?.trim() : request.ip;
  const result = await service.operatorSignup({
    companyName: body.companyName,
    gstin: body.gstin,
    pan: body.pan,
    email: body.email,
    phone: body.phone,
    password: body.password,
    ip,
  });
  return reply.status(201).send(success(result));
}