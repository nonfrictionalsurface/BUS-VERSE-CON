import type { FastifyInstance } from 'fastify';

export async function healthRoutes(server: FastifyInstance): Promise<void> {
  server.get('/v1/health', async () => {
    return { status: 'ok' };
  });
}