import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const GRACE_HOURS = 1;

export async function runPurgeOtpChallenges(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - GRACE_HOURS * 3_600_000);
  const result = await prisma.otpChallenge.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  logger.info({ deleted: result.count, cutoff: cutoff.toISOString() }, 'purge-otp-challenges: complete');
  return { deleted: result.count };
}