import type { Prisma } from '@prisma/client';

/**
 * Serialize work under a Postgres transaction-scoped advisory lock.
 * `pg_advisory_xact_lock` auto-releases on commit or rollback.
 * Per 06 v1.2 §7.4 A2 — used around nextInvoiceNumber + gst_invoices.create
 * to prevent sequence gap if the webhook transaction retries.
 */
export async function withAdvisoryLock<T>(
  tx: Prisma.TransactionClient,
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
  return fn();
}