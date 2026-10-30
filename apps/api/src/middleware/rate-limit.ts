import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { isTest } from '../config/env.js';

export async function rateLimitMiddleware(server: FastifyInstance): Promise<void> {
  // Bypass rate limiting entirely in tests (per D8 / locked decision)
  if (isTest) return;

  await server.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: () => false,
  });
}