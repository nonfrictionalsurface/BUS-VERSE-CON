import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const EXPIRY_GRACE_HOURS = 1;
const USED_GRACE_HOURS = 24;

export async function runPurgePasswordResetTokens(): Promise<{ deleted: number }> {
  const expiryCutoff = new Date(Date.now() - EXPIRY_GRACE_HOURS * 3_600_000);
  const usedCutoff = new Date(Date.now() - USED_GRACE_HOURS * 3_600_000);
  const result = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: expiryCutoff } },
        { AND: [{ usedAt: { not: null } }, { createdAt: { lt: usedCutoff } }] },
      ],
    },
  });
  logger.info({ deleted: result.count }, 'purge-password-reset-tokens: complete');
  return { deleted: result.count };
}