import type { FastifyInstance } from 'fastify';

/**
 * Enforce application/json for POST/PUT/PATCH bodies.
 * Webhooks are exempted (they have their own signature + content-type).
 */
export async function contentTypeMiddleware(server: FastifyInstance): Promise<void> {
  server.addHook('onRequest', async (request, reply) => {
    const method = request.method;
    if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') return;

    if (request.url.startsWith('/v1/webhooks/')) return;

    const len = Number(request.headers['content-length'] ?? 0);
    if (len === 0) return;

    const ct = String(request.headers['content-type'] ?? '').toLowerCase();
    if (!ct.includes('application/json')) {
      reply.code(415).send({
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type must be application/json',
          requestId: request.id,
        },
      });
    }
  });
}