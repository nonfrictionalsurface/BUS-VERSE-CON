import { redis, keys } from './redis.js';
import { sha256 } from './crypto.js';

const TTL_SECONDS = 86400;      // 24h per 06 §3.4
const LOCK_TTL_SECONDS = 30;    // in-flight guard

export interface CachedResponse {
  bodyHash: string;
  statusCode: number;
  payload: unknown;
}

export function hashBody(body: unknown): string {
  return sha256(JSON.stringify(body));
}

export async function getCachedResponse(key: string): Promise<CachedResponse | null> {
  const raw = await redis.get(keys.idempotency(key));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedResponse>;
    if (typeof parsed.bodyHash !== 'string' || typeof parsed.statusCode !== 'number') return null;
    return parsed as CachedResponse;
  } catch {
    return null;
  }
}

export async function setCachedResponse(
  key: string,
  bodyHash: string,
  statusCode: number,
  payload: unknown,
): Promise<void> {
  const value = JSON.stringify({ bodyHash, statusCode, payload } satisfies CachedResponse);
  await redis.set(keys.idempotency(key), value, 'EX', TTL_SECONDS);
}

export async function acquireIdempotencyLock(key: string): Promise<boolean> {
  const result = await redis.set(`${keys.idempotency(key)}:lock`, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
  return result === 'OK';
}

export async function releaseIdempotencyLock(key: string): Promise<void> {
  await redis.del(`${keys.idempotency(key)}:lock`);
}