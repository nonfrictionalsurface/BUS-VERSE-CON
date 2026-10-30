import type { FastifyInstance } from 'fastify';

export async function requestIdMiddleware(server: FastifyInstance): Promise<void> {
  server.addHook('onRequest', async (request, reply) => {
    reply.header('X-Request-Id', request.id);
  });
}