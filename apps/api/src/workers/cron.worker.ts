import { Worker, type Job } from 'bullmq';
import { logger } from '../lib/logger.js';
import { redisConnection } from './queue.js';
import { QUEUE_CRON } from './types.js';
import { CRON_DISPATCH } from './scheduler.js';

let cronWorker: Worker | null = null;

export function startCronWorker(): Worker {
  if (cronWorker) return cronWorker;
  cronWorker = new Worker(
    QUEUE_CRON,
    async (job: Job) => {
      const fn = CRON_DISPATCH.get(job.name);
      if (!fn) {
        logger.warn({ jobName: job.name }, 'cron.worker: unknown job — skipping');
        return { skipped: true };
      }
      return await fn();
    },
    { connection: redisConnection, concurrency: 1 },
  );
  cronWorker.on('completed', (job) => logger.info({ jobId: job.id, name: job.name }, 'cron.worker: completed'));
  cronWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, name: job?.name, err }, 'cron.worker: failed'));
  logger.info('cron.worker: started');
  return cronWorker;
}

export async function stopCronWorker(): Promise<void> {
  if (cronWorker) {
    await cronWorker.close();
    cronWorker = null;
    logger.info('cron.worker: stopped');
  }
}