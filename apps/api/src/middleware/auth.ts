import type { FastifyInstance } from 'fastify';
import { verifyAccessToken } from '../modules/identity/jwt.service.js';
import { prisma } from '../lib/prisma.js';
import { redis, keys } from '../lib/redis.js';

export async function authMiddleware(server: FastifyInstance): Promise<void> {
  server.addHook('onRequest', async (request) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      request.user = null;
      return;
    }

    const token = header.slice('Bearer '.length).trim();
    let claims;
    try {
      claims = verifyAccessToken(token);
    } catch {
      request.user = null;
      return;
    }

    const revoked = await redis.exists(keys.revokedSession(claims.sid));
    if (revoked === 1) {
      request.user = null;
      return;
    }

    const session = await prisma.session.findUnique({ where: { id: claims.sid } });
    if (!session || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
      request.user = null;
      return;
    }

    request.user = {
      userId: claims.sub,
      role: claims.role,
      sessionId: claims.sid,
    };
  });
}