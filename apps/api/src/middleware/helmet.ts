import helmet from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';

export async function helmetMiddleware(server: FastifyInstance): Promise<void> {
  await server.register(helmet, {
    // CSP enabled by default in Phase 12; disabled here so WS + Swagger UI work
    contentSecurityPolicy: false,
  });
}