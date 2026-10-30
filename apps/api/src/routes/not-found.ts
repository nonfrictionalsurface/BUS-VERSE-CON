import type { FastifyInstance } from 'fastify';

export async function registerNotFoundHandler(server: FastifyInstance): Promise<void> {
  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        requestId: request.id,
      },
    });
  });
}