import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { sha256 } from '../../lib/crypto.js';
import { errors } from '../../lib/errors.js';
import {
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
  type Role,
} from './identity.types.js';

export interface AccessTokenClaims {
  sub: string; // userId
  sid: string; // sessionId
  role: Role;
  iat: number;
  exp: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/**
 * Issue access (JWT) + refresh (opaque) tokens for a new session.
 * Creates the session and refresh-token chain in one transaction.
 */
export async function issueSessionTokens(params: {
  userId: string;
  role: Role;
  sessionId: string;
  deviceFingerprintHash?: string;
  activeTripId?: string;
}): Promise<IssuedTokens> {
  const { userId, role, sessionId, deviceFingerprintHash } = params;

  const accessTtl = ACCESS_TTL_SECONDS[role];
  const refreshTtl = REFRESH_TTL_SECONDS[role];

  const accessToken = jwt.sign(
    { sub: userId, sid: sessionId, role, jti: crypto.randomUUID() },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: accessTtl },
  );

  const refreshRaw = crypto.randomBytes(32).toString('base64');
  const refreshHash = sha256(refreshRaw);

  const expiresAt = new Date(Date.now() + refreshTtl * 1000);

  await prisma.$transaction([
    prisma.session.create({
      data: {
        id: sessionId,
        userId,
        role,
        refreshHash,
        deviceFingerprintHash: deviceFingerprintHash ?? null,
        expiresAt,
        status: 'ACTIVE',
      },
    }),
    prisma.refreshTokenChain.create({
      data: { sessionId, usedHashes: [] },
    }),
  ]);

  return {
    accessToken,
    refreshToken: refreshRaw,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Verify an access token. Returns claims or throws UNAUTHORIZED.
 * Callers should also check session status (via `assertSessionActive`).
 */
export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return decoded as AccessTokenClaims;
  } catch {
    throw errors.unauthorized('Invalid or expired token');
  }
}

/**
 * Rotate refresh token. Detects replay and revokes the entire chain if
 * an already-used token is presented.
 */
export async function rotateRefreshToken(
  oldRefreshRaw: string,
): Promise<IssuedTokens> {
  const oldHash = sha256(oldRefreshRaw);

  // Case 1: current hash matches — normal rotation
  const currentSession = await prisma.session.findFirst({
    where: { refreshHash: oldHash, status: 'ACTIVE' },
  });

  if (currentSession) {
    const role = currentSession.role as Role;
    const refreshTtl = REFRESH_TTL_SECONDS[role];

    const newRefreshRaw = crypto.randomBytes(32).toString('base64');
    const newRefreshHash = sha256(newRefreshRaw);

    const expiresAt = new Date(Date.now() + refreshTtl * 1000);

    await prisma.$transaction([
      prisma.session.update({
        where: { id: currentSession.id },
        data: { refreshHash: newRefreshHash, expiresAt },
      }),
      prisma.$executeRaw`
        UPDATE refresh_token_chains
        SET used_hashes = used_hashes || ${JSON.stringify([oldHash])}::jsonb,
            updated_at = now(),
            version = version + 1
        WHERE session_id = ${currentSession.id}::uuid
      `,
    ]);

    const newAccessToken = jwt.sign(
      { sub: currentSession.userId, sid: currentSession.id, role, jti: crypto.randomUUID() },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: ACCESS_TTL_SECONDS[role] },
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshRaw,
      expiresAt: expiresAt.toISOString(),
    };
  }

  // Case 2: hash is in used_hashes for an active session — REPLAY detected
  const replayRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT s.id
    FROM sessions s
    JOIN refresh_token_chains c ON c.session_id = s.id
    WHERE s.status = 'ACTIVE'
      AND c.used_hashes @> ${JSON.stringify([oldHash])}::jsonb
    LIMIT 1
  `;

  if (replayRows.length > 0 && replayRows[0]) {
    const replayedSessionId = replayRows[0].id;
    await prisma.session.update({
      where: { id: replayedSessionId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokeReason: 'REFRESH_REPLAY',
      },
    });
    throw errors.refreshReplayed();
  }

  // Case 3: unknown token — invalid
  throw errors.unauthorized('Invalid refresh token');
}

/**
 * Revoke a session by id. Idempotent.
 */
export async function revokeSession(
  sessionId: string,
  reason = 'USER_LOGOUT',
): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, status: 'ACTIVE' },
    data: { status: 'REVOKED', revokedAt: new Date(), revokeReason: reason },
  });
}

/**
 * Revoke all sessions of a given actor. Used on password reset and
 * on cascade revocation (Phase 2b calls this).
 */
export async function revokeAllSessionsForUser(
  userId: string,
  reason = 'PASSWORD_CHANGED',
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: { userId, status: 'ACTIVE' },
    data: { status: 'REVOKED', revokedAt: new Date(), revokeReason: reason },
  });
  return result.count;
}

/**
 * Revoke all DRIVER sessions for a driver userId EXCEPT the given session.
 * Used for single-device binding (per `04` §7.3).
 */
export async function revokeOtherDriverSessions(
  userId: string,
  keepSessionId: string,
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      role: 'DRIVER',
      status: 'ACTIVE',
      id: { not: keepSessionId },
    },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
      revokeReason: 'SINGLE_DEVICE_REPLACED',
    },
  });
  return result.count;
}