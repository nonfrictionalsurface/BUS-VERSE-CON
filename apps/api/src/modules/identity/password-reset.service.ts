import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { sha256 } from '../../lib/crypto.js';
import { errors } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { emailAdapter } from '../../integrations/sendgrid.js';
import { hashPassword } from '../../lib/password.js';
import { normalizeEmail } from '../../lib/email.js';
import { normalizePhone } from '../../lib/phone.js';
import { redis, keys } from '../../lib/redis.js';
import { RESET_TOKEN_TTL_SECONDS } from './identity.types.js';
import { createOtpChallenge, consumeOtpChallenge } from './otp.service.js';
import { revokeAllSessionsForUser } from './jwt.service.js';
import { emitIdentityEvent } from './identity.events.js';

export type ResetActor = 'operator' | 'admin';

async function enforceResetRate(identifier: string): Promise<void> {
  const key = keys.rateLimit('pw-reset', identifier);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 3600);
  if (count > 3) {
    throw errors.rateLimited('Too many password reset attempts. Try again in 1 hour.');
  }
}

export async function requestEmailReset(
  email: string,
  actor: ResetActor,
): Promise<{ sent: true }> {
  const normalized = normalizeEmail(email);
  await enforceResetRate(`email:${actor}:${normalized}`);

  const user = await prisma.user.findFirst({
    where: { email: normalized, deletedAt: null },
  });

  if (!user) {
    logger.info({ email: normalized, actor }, '[password-reset] unknown email');
    return { sent: true };
  }

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const resetUrl = `https://busverse.app/reset?token=${rawToken}`;
  await emailAdapter.send({
    to: normalized,
    subject: 'Reset your BusVerse password',
    body: `Click to reset your password (expires in 30 minutes): ${resetUrl}`,
    template: 'password_reset',
  });

  emitIdentityEvent({
    type: 'password_reset_requested',
    userId: user.id,
    metadata: { actor, channel: 'EMAIL' },
  });

  return { sent: true };
}

export async function requestPhoneReset(
  phone: string,
  actor: ResetActor,
): Promise<{ sent: true; expiresInSeconds: number }> {
  const normalized = normalizePhone(phone);
  await enforceResetRate(`phone:${actor}:${normalized}`);

  const user = await prisma.user.findFirst({
    where: { phone: normalized, deletedAt: null },
  });

  if (!user) {
    logger.info({ phone: normalized, actor }, '[password-reset] unknown phone');
    return { sent: true, expiresInSeconds: 600 };
  }

  const { expiresInSeconds } = await createOtpChallenge({
    identifier: normalized,
    channel: 'PHONE',
    purpose: 'RESET',
  });

  emitIdentityEvent({
    type: 'password_reset_requested',
    userId: user.id,
    metadata: { actor, channel: 'PHONE' },
  });

  return { sent: true, expiresInSeconds };
}

export async function completeEmailReset(
  rawToken: string,
  newPassword: string,
): Promise<{ reset: true; sessionsRevoked: number }> {
  const tokenHash = sha256(rawToken);

  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.deletedAt) throw errors.resetTokenInvalid();
  if (row.expiresAt < new Date()) throw errors.resetTokenExpired();

  const passwordHash = await hashPassword(newPassword);

  const [tokenUpdate, operatorUpdate, adminUpdate] = await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.operatorUser.updateMany({
      where: { userId: row.userId, deletedAt: null },
      data: { passwordHash },
    }),
    prisma.adminUser.updateMany({
      where: { userId: row.userId, deletedAt: null },
      data: { passwordHash },
    }),
  ]);

  if (tokenUpdate.count === 0) throw errors.resetTokenInvalid();
  if (operatorUpdate.count === 0 && adminUpdate.count === 0) {
    throw errors.resetTokenInvalid();
  }

  const sessionsRevoked = await revokeAllSessionsForUser(row.userId, 'PASSWORD_RESET');

  emitIdentityEvent({
    type: 'password_reset_completed',
    userId: row.userId,
    metadata: { channel: 'EMAIL', sessionsRevoked },
  });

  return { reset: true, sessionsRevoked };
}

export async function completePhoneReset(
  phone: string,
  otp: string,
  newPassword: string,
): Promise<{ reset: true; sessionsRevoked: number }> {
  const normalized = normalizePhone(phone);

  const user = await prisma.user.findFirst({
    where: { phone: normalized, deletedAt: null },
  });
  if (!user) throw errors.resetTokenInvalid();

  await consumeOtpChallenge({ identifier: normalized, otp, purpose: 'RESET' });

  const passwordHash = await hashPassword(newPassword);

  const [operatorUpdate, adminUpdate] = await prisma.$transaction([
    prisma.operatorUser.updateMany({
      where: { userId: user.id, deletedAt: null },
      data: { passwordHash },
    }),
    prisma.adminUser.updateMany({
      where: { userId: user.id, deletedAt: null },
      data: { passwordHash },
    }),
  ]);

  if (operatorUpdate.count === 0 && adminUpdate.count === 0) {
    throw errors.resetTokenInvalid();
  }

  const sessionsRevoked = await revokeAllSessionsForUser(user.id, 'PASSWORD_RESET');

  emitIdentityEvent({
    type: 'password_reset_completed',
    userId: user.id,
    metadata: { channel: 'PHONE', sessionsRevoked },
  });

  return { reset: true, sessionsRevoked };
}