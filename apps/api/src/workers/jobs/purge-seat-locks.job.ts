import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

export async function runPurgeSeatLocks(): Promise<{ deleted: number }> {
  const now = new Date();
  const result = await prisma.seatLock.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  logger.info({ deleted: result.count, at: now.toISOString() }, 'purge-seat-locks: complete');
  return { deleted: result.count };
}