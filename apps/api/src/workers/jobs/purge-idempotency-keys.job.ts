import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const AGE_HOURS = 24;

export async function runPurgeIdempotencyKeys(): Promise<{ nulled: number }> {
  const cutoff = new Date(Date.now() - AGE_HOURS * 3_600_000);
  const result = await prisma.$executeRaw`
    UPDATE payments
    SET idempotency_key = 'expired_' || id::text || '_' || extract(epoch from now())::bigint
    WHERE created_at < ${cutoff}
      AND status IN ('FAILED', 'EXPIRED')
      AND idempotency_key NOT LIKE 'expired_%'
  `;
  logger.info({ nulled: result, cutoff: cutoff.toISOString() }, 'purge-idempotency-keys: complete');
  return { nulled: result };
}