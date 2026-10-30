import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const RETENTION_DAYS = 90;
const PARTITION_REGEX = /^gps_samples_\d{4}_\d{2}_\d{2}$/;

export async function runPurgeGpsPartitions(): Promise<{ dropped: number; names: string[] }> {
  const rows = await prisma.$queryRawUnsafe<Array<{ relname: string }>>(
    `SELECT relname FROM pg_class WHERE relkind = 'r' AND relname LIKE 'gps_samples_%' ORDER BY relname`,
  );

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);

  const toDrop: string[] = [];
  for (const row of rows) {
    if (!PARTITION_REGEX.test(row.relname)) continue;
    const suffix = row.relname.replace(/^gps_samples_/, '').replace(/_/g, '-');
    const partDate = new Date(`${suffix}T00:00:00.000Z`);
    if (Number.isNaN(partDate.getTime())) continue;
    if (partDate < cutoff) toDrop.push(row.relname);
  }

  for (const name of toDrop) {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${name}"`);
    logger.info({ partition: name }, 'purge-gps-partitions: dropped');
  }

  return { dropped: toDrop.length, names: toDrop };
}