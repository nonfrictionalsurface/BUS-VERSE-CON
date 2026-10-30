import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

export async function runEnsureSequences(): Promise<{ created: string[] }> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const names: string[] = [];
  names.push(`booking_reference_seq_${year + 1}`);
  const fyStart = month >= 4 ? year : year - 1;
  const nextFyStart = fyStart + 1;
  const nextFyEndShort = String((nextFyStart + 1) % 100).padStart(2, '0');
  names.push(`invoice_number_seq_${nextFyStart}_${nextFyEndShort}`);
  const created: string[] = [];
  for (const name of names) {
    const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = $1) AS exists`,
      name,
    );
    if (rows[0]?.exists === true) continue;
    await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS "${name}" START 1`);
    created.push(name);
  }
  logger.info({ created }, 'ensure-sequences: complete');
  return { created };
}