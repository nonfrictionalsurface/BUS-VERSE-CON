import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
export async function corsMiddleware(server: FastifyInstance): Promise<void> {
  await server.register(cors, {
    origin: true, credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-Id', 'Accept', 'Cache-Control', 'Pragma', 'Origin'],
    maxAge: 86400,
  });
  console.log('[cors] DEV MODE: reflecting ALL origins');
}