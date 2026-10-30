import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const STALE_HOURS = 6;

export async function runResetStaleOnDuty(): Promise<{ reset: number }> {
  const cutoff = new Date(Date.now() - STALE_HOURS * 3_600_000);
  const stale = await prisma.driverProfile.findMany({
    where: {
      onDuty: true,
      updatedAt: { lt: cutoff },
      deletedAt: null,
      trips: { none: { status: 'IN_PROGRESS', deletedAt: null } },
    },
    select: { id: true },
  });
  if (stale.length === 0) {
    logger.info('reset-stale-on-duty: no stale drivers');
    return { reset: 0 };
  }
  const result = await prisma.driverProfile.updateMany({
    where: { id: { in: stale.map((d) => d.id) } },
    data: { onDuty: false },
  });
  logger.info({ reset: result.count }, 'reset-stale-on-duty: complete');
  return { reset: result.count };
}