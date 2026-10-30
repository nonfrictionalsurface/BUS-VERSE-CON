import type { FastifyInstance, FastifyError } from 'fastify';

/**
 * DomainError structural check — works regardless of class identity.
 * Any object with string `code`, numeric `httpStatus`, string `message`
 * is treated as a DomainError.
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

/**
 * ZodError structural check.
 */
function isZodError(err: unknown): err is { issues: unknown[]; message: string } {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (!Array.isArray(e.issues)) return false;
  const ctor = (err as { constructor?: { name?: string } }).constructor;
  return e.name === 'ZodError' || ctor?.name === 'ZodError';
}

export async function registerErrorHandler(server: FastifyInstance): Promise<void> {
  server.setErrorHandler((error, request, reply) => {
    // === DIAGNOSTIC — always fires in test mode, before any branching ===
    if (process.env.NODE_ENV === 'test') {
      console.log('[err-handler-ROOT]', {
        url: request.url,
        method: request.method,
        errName: (error as { name?: string })?.name,
        errCtor: (error as { constructor?: { name?: string } })?.constructor?.name,
        code: (error as { code?: unknown })?.code,
        httpStatus: (error as { httpStatus?: unknown })?.httpStatus,
        hasIssues: Array.isArray((error as { issues?: unknown })?.issues),
        isDomain: isDomainError(error),
        isZod: isZodError(error),
      });
    }

    // === DomainError ===
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

    // === ZodError ===
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

    // === Fastify / generic ===
    const fastifyErr = error as FastifyError;
    const statusCode = fastifyErr.statusCode ?? 500;
    const isProd = process.env.NODE_ENV === 'production';
    return reply.status(statusCode).send({
      error: {
        code: fastifyErr.code ?? 'INTERNAL_ERROR',
        message: isProd ? 'Something went wrong' : fastifyErr.message,
        requestId: request.id,
      },
    });
  });
}