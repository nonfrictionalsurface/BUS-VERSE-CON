import { Worker, type Job } from 'bullmq';
import { logger } from '../lib/logger.js';
import {
  readFallback,
  deleteFallback,
  moveToFailed,
} from '../lib/webhook-fallback.js';
import { handleRazorpayWebhook } from '../modules/webhooks/webhooks.service.js';
import { redisConnection } from './queue.js';
import { QUEUE_WEBHOOK_REPLAY, JOB_REPLAY_WEBHOOK } from './types.js';

let webhookWorker: Worker | null = null;

interface ReplayData {
  filePath: string;
  fileName: string;
}

export function startWebhookReplayWorker(): Worker {
  if (webhookWorker) return webhookWorker;

  webhookWorker = new Worker<ReplayData>(
    QUEUE_WEBHOOK_REPLAY,
    async (job: Job<ReplayData>) => {
      const { filePath, fileName } = job.data;
      const { rawBody, meta } = await readFallback(filePath);
      const signature = (meta.signature as string | undefined) ?? '';
      const result = await handleRazorpayWebhook(rawBody, signature, { isReplay: true });
      await deleteFallback(filePath);
      logger.info({ fileName, result }, 'webhook-replay: success');
      return result;
    },
    {
      connection: redisConnection,
      concurrency: 3,
    },
  );

  webhookWorker.on('failed', (job, err) => {
    logger.warn(
      { jobId: job?.id, fileName: job?.data.fileName, attempts: job?.attemptsMade, err: err.message },
      'webhook-replay: attempt failed',
    );
    if (job && job.attemptsMade >= (job.opts.attempts ?? 10)) {
      void moveToFailed(job.data.filePath).then((dest) =>
        logger.error({ dest }, 'webhook-replay: moved to failed (SEV1)'),
      );
    }
  });
  webhookWorker.on('completed', (job) => logger.info({ jobId: job.id }, 'webhook-replay: completed'));
  logger.info('webhook-replay worker: started');
  return webhookWorker;
}

export async function stopWebhookReplayWorker(): Promise<void> {
  if (webhookWorker) {
    await webhookWorker.close();
    webhookWorker = null;
    logger.info('webhook-replay worker: stopped');
  }
}

// Exported for tests
export const WEBHOOK_REPLAY_QUEUE_NAME = QUEUE_WEBHOOK_REPLAY;
export const WEBHOOK_REPLAY_JOB_NAME = JOB_REPLAY_WEBHOOK;