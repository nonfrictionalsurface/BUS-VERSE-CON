import { Redis, type RedisOptions } from 'ioredis';
import { env } from '../config/env.js';

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
};

export const redis = new Redis(env.REDIS_URL, baseOptions);

redis.on('connect', () => {
  if (env.NODE_ENV !== 'test') console.warn('[redis] connected');
});
redis.on('error', (err: Error) => {
  if (env.NODE_ENV !== 'test') console.error('[redis] error', err.message);
});

export const keys = {
  seatLock: (scheduleId: string, seatId: string) => `lock:${scheduleId}:${seatId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  revokedSession: (sessionId: string) => `revoked:${sessionId}`,
  gpsTrip: (tripId: string) => `gps:trip:${tripId}`,
  tripState: (tripId: string) => `trip:state:${tripId}`,
  liveCache: (tripId: string) => `live:${tripId}`,
  rateLimit: (tier: string, identity: string) => `rl:${tier}:${identity}`,
  idempotency: (key: string) => `idem:${key}`,
};

export async function closeRedis(): Promise<void> {
  await redis.quit();
}