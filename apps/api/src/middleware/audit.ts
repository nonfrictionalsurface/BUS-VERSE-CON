import type { FastifyInstance } from 'fastify';

/**
 * Phase 1c: stub. Logs request completion via Pino.
 * Phase 7: persist to audit_logs table.
 */
export async function auditMiddleware(server: FastifyInstance): Promise<void> {
  server.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        event: 'request_completed',
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
        userId: request.user?.userId ?? null,
      },
      'request_completed',
    );
  });
}