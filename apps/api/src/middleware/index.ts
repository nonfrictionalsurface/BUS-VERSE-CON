import type { FastifyInstance } from 'fastify';
import { requestIdMiddleware } from './request-id.js';
import { corsMiddleware } from './cors.js';
import { helmetMiddleware } from './helmet.js';
import { contentTypeMiddleware } from './content-type.js';
import { rateLimitMiddleware } from './rate-limit.js';
import { authMiddleware } from './auth.js';
import { auditMiddleware } from './audit.js';

/**
 * Middleware registration order matters:
 *   1. request-id → assigns X-Request-Id (first hook)
 *   2. cors → handles preflight (must be early)
 *   3. helmet → sets security headers (onSend, order-flexible)
 *   4. content-type → enforces JSON body
 *   5. rate-limit → blocks abuse (skipped in tests)
 *   6. auth → hydrates request.user
 *   7. audit → logs completion (onResponse)
 */
export async function registerMiddleware(server: FastifyInstance): Promise<void> {
  await requestIdMiddleware(server);
  await corsMiddleware(server);
  await helmetMiddleware(server);
  await contentTypeMiddleware(server);
  await rateLimitMiddleware(server);
  await authMiddleware(server);
  await auditMiddleware(server);
}