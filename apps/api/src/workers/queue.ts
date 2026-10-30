import { Queue, type ConnectionOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { QUEUE_CRON, QUEUE_WEBHOOK_REPLAY, QUEUE_AUDIT_EXPORT } from './types.js';

// BullMQ blocking commands require maxRetriesPerRequest: null.
// RedisOptions (not ConnectionOptions union) keeps the spread type-safe.
function parseRedisUrl(url: string): RedisOptions {
  const u = new URL(url);
  const opts: RedisOptions = {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
  };
  if (u.password) opts.password = decodeURIComponent(u.password);
  if (u.username) opts.username = decodeURIComponent(u.username);
  if (u.protocol === 'rediss:') opts.tls = {};
  return opts;
}

export const redisConnection: ConnectionOptions = {
  ...parseRedisUrl(env.REDIS_URL),
  maxRetriesPerRequest: null,
};

let cronQueue: Queue | null = null;
let auditExportQueue: Queue | null = null;
let webhookReplayQueue: Queue | null = null;

export function getCronQueue(): Queue {
  if (!cronQueue) {
    cronQueue = new Queue(QUEUE_CRON, {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return cronQueue;
}

export function getWebhookReplayQueue(): Queue {
  if (!webhookReplayQueue) {
    webhookReplayQueue = new Queue(QUEUE_WEBHOOK_REPLAY, {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: 10,
        backoff: { type: 'exponential', delay: 1000 },
      },
    });
  }
  return webhookReplayQueue;
}

export function getAuditExportQueue(): Queue {
  if (!auditExportQueue) {
    auditExportQueue = new Queue(QUEUE_AUDIT_EXPORT, {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }
  return auditExportQueue;
}

export async function closeQueues(): Promise<void> {
  try {
    if (cronQueue) await cronQueue.close();
  } catch (e) {
    logger.warn({ e }, 'cronQueue close failed');
  }
  try {
    if (webhookReplayQueue) await webhookReplayQueue.close();
  } catch (e) {
    logger.warn({ e }, 'webhookReplayQueue close failed');
  }
  try { if (auditExportQueue) await auditExportQueue.close(); } catch (e) { logger.warn({ e }, 'auditExportQueue close failed'); }
  cronQueue = null;
  webhookReplayQueue = null;
  auditExportQueue = null;
}