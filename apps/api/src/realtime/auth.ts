import { verifyAccessToken } from '../modules/identity/jwt.service.js';
import { prisma } from '../lib/prisma.js';
import { redis, keys } from '../lib/redis.js';

export interface WsClaims {
  userId: string;
  sessionId: string;
  role: string;
  exp: number;
}

export type WsAuthReason = 'INVALID_TOKEN' | 'SESSION_REVOKED' | 'SESSION_INACTIVE';

export class WsAuthError extends Error {
  constructor(public readonly reason: WsAuthReason) {
    super(reason);
    this.name = 'WsAuthError';
  }
}

export function isWsAuthError(err: unknown): err is { reason: WsAuthReason } {
  return !!err && typeof err === 'object' && typeof (err as { reason?: unknown }).reason === 'string';
}

export async function verifyHandshake(token: string): Promise<WsClaims> {
  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch {
    throw new WsAuthError('INVALID_TOKEN');
  }

  const revoked = await redis.exists(keys.revokedSession(claims.sid));
  if (revoked === 1) throw new WsAuthError('SESSION_REVOKED');

  const session = await prisma.session.findUnique({ where: { id: claims.sid } });
  if (!session || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
    throw new WsAuthError('SESSION_INACTIVE');
  }

  return {
    userId: claims.sub,
    sessionId: claims.sid,
    role: claims.role,
    exp: claims.exp,
  };
}