import { errors } from './errors.js';

/**
 * Maps Prisma connection errors to SERVICE_UNAVAILABLE (503).
 * Used by seat-lock, booking, and payments services so a Postgres outage
 * fails closed with a clear error code rather than leaking a raw Prisma
 * error as a 500 (which exposes internals to clients).
 */
export function mapDbConnectionError(err: unknown): Error {
  const anyErr = err as { code?: string; message?: string };
  if (
    anyErr.code === 'P1001' ||
    anyErr.code === 'P1002' ||
    anyErr.code === 'P1008' ||
    anyErr.code === 'P1017' ||
    (typeof anyErr.message === 'string' &&
      /(can'?t reach|ECONNREFUSED|connection.*refused|connection.*closed)/i.test(anyErr.message))
  ) {
    return errors.serviceUnavailable('Database unavailable');
  }
  return err as Error;
}