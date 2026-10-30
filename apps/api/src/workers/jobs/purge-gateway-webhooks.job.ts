import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const RETENTION_DAYS = 90;

export async function runPurgeGatewayWebhooks(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  const result = await prisma.gatewayWebhook.deleteMany({
    where: { receivedAt: { lt: cutoff } },
  });
  logger.info({ deleted: result.count, cutoff: cutoff.toISOString() }, 'purge-gateway-webhooks: complete');
  return { deleted: result.count };
}