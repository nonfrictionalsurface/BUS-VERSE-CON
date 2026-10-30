import { logger } from '../lib/logger.js';
import { listFallbackFiles } from '../lib/webhook-fallback.js';
import { getWebhookReplayQueue } from './queue.js';
import { JOB_REPLAY_WEBHOOK } from './types.js';

const INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | null = null;

// Producer: scans /tmp/webhooks/ every 60s, enqueues each file as a replay job.
// Consumer (webhook-replay.worker.ts) does the retry-with-backoff via BullMQ.
// Idempotency: jobId = filename, so re-scanning the same file won't double-enqueue.
export async function runReplayTick(): Promise<void> {
  try {
    const queue = getWebhookReplayQueue();
    const files = await listFallbackFiles();
    for (const f of files) {
      await queue.add(
        JOB_REPLAY_WEBHOOK,
        { filePath: f.path, fileName: f.fileName },
        { jobId: f.fileName },
      );
    }
    if (files.length > 0) logger.info({ enqueued: files.length }, 'replay-webhooks: enqueued');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'replay-webhooks: tick failed');
  }
}

export function startReplayWorker(): void {
  if (timer) return;
  timer = setInterval(() => { void runReplayTick(); }, INTERVAL_MS);
  timer.unref();
  logger.info({ intervalMs: INTERVAL_MS }, 'replay-webhooks producer: started');
}

export function stopReplayWorker(): void {
  if (timer) { clearInterval(timer); timer = null; }
  logger.info('replay-webhooks producer: stopped');
}