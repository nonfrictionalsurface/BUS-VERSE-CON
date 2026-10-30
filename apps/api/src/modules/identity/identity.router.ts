import type { FastifyInstance } from 'fastify';
import * as c from './identity.controller.js';
import { requireRole } from '../../middleware/require-role.js';
import { getPassengerMe } from './passenger.profile.controller.js';

/**
 * Plugin-scoped error handler. Guarantees DomainErrors map to the right
 * HTTP status for identity routes, regardless of ordering issues in the
 * parent app's `setErrorHandler` registration.
 */
function isDomainError(
  err: unknown,
): err is { code: string; httpStatus: number; message: string; details?: Record<string, unknown> } {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  return (
    typeof e.code === 'string' &&
    typeof e.httpStatus === 'number' &&
    typeof e.message === 'string'
  );
}

function isZodError(err: unknown): err is { issues: unknown[]; message: string } {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (!Array.isArray(e.issues)) return false;
  const ctor = (err as { constructor?: { name?: string } }).constructor;
  return e.name === 'ZodError' || ctor?.name === 'ZodError';
}

export async function identityRouter(server: FastifyInstance): Promise<void> {
  // Scoped error handler — takes precedence for routes in this plugin
  server.setErrorHandler((error, request, reply) => {
    if (process.env.NODE_ENV === 'test') {
      console.log('[err-handler-ROUTER]', {
        url: request.url,
        errName: (error as { name?: string })?.name,
        errCtor: (error as { constructor?: { name?: string } })?.constructor?.name,
        code: (error as { code?: unknown })?.code,
        httpStatus: (error as { httpStatus?: unknown })?.httpStatus,
        hasIssues: Array.isArray((error as { issues?: unknown })?.issues),
        isDomain: isDomainError(error),
        isZod: isZodError(error),
      });
    }

    if (isDomainError(error)) {
      return reply.status(error.httpStatus).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
          requestId: request.id,
        },
      });
    }

    if (isZodError(error)) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { issues: error.issues },
          requestId: request.id,
        },
      });
    }

    const anyErr = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = anyErr.statusCode ?? 500;
    const isProd = process.env.NODE_ENV === 'production';
    return reply.status(statusCode).send({
      error: {
        code: anyErr.code ?? 'INTERNAL_ERROR',
        message: isProd ? 'Something went wrong' : (anyErr.message ?? 'Unknown error'),
        requestId: request.id,
      },
    });
  });

  // ── Routes ──
  server.post('/passenger/auth/otp/request', c.postPassengerOtpRequest);
  server.post('/passenger/auth/otp/verify', c.postPassengerOtpVerify);
  server.get('/passenger/me', { preHandler: requireRole('REGISTERED_PASSENGER') }, getPassengerMe);

  server.post('/driver/auth/otp/request', c.postDriverOtpRequest);
  server.post('/driver/auth/otp/verify', c.postDriverOtpVerify);

  server.post('/operator/auth/signup', c.postOperatorSignup);
  server.post('/operator/auth/login', c.postOperatorLogin);
  server.post('/operator/auth/otp/request', c.postOperatorOtpRequest);
  server.post('/operator/auth/otp/verify', c.postOperatorOtpVerify);
  server.post('/operator/auth/reset/request', c.postOperatorResetRequest);
  server.post('/operator/auth/reset/verify', c.postOperatorResetVerify);

  server.post('/admin/auth/login', c.postAdminLogin);
  server.post('/admin/auth/reset/request', c.postAdminResetRequest);
  server.post('/admin/auth/reset/verify', c.postAdminResetVerify);

  server.post('/:surface/auth/refresh', c.postRefresh);
  server.post('/:surface/auth/logout', c.postLogout);
}