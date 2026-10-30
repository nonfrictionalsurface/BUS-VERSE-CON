import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const RETENTION_DAYS = 180;

export async function runPurgeSessions(): Promise<{ deleted: number }> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);

  const result = await prisma.session.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  logger.info({ deleted: result.count, cutoff: cutoff.toISOString() }, 'purge-sessions: complete');
  return { deleted: result.count };
}