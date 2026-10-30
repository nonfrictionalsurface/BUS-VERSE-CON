import { Worker, type Job } from 'bullmq';
import { logger } from '../lib/logger.js';
import * as auditService from '../modules/audit/audit.service.js';
import { redisConnection } from './queue.js';
import { QUEUE_AUDIT_EXPORT, type AuditExportJobData } from './types.js';

const ASYNC_MAX_ROWS = 50_000;
let auditExportWorker: Worker | null = null;

export function startAuditExportWorker(): Worker {
  if (auditExportWorker) return auditExportWorker;

  auditExportWorker = new Worker<AuditExportJobData>(
    QUEUE_AUDIT_EXPORT,
    async (job: Job<AuditExportJobData>) => {
      const result = await auditService.exportAuditLogsCsv(job.data.filters, { maxRows: ASYNC_MAX_ROWS });
      logger.info({ jobId: job.id, rowCount: result.rowCount }, 'audit-export: completed');
      return { rowCount: result.rowCount, capped: result.capped, csv: result.csv };
    },
    { connection: redisConnection, concurrency: 1 },
  );

  auditExportWorker.on('failed', (job, err) => {
    logger.warn({ jobId: job?.id, attempts: job?.attemptsMade, err: err.message }, 'audit-export: failed');
  });
  auditExportWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'audit-export: done');
  });
  logger.info('audit-export worker: started');
  return auditExportWorker;
}

export async function stopAuditExportWorker(): Promise<void> {
  if (auditExportWorker) {
    await auditExportWorker.close();
    auditExportWorker = null;
    logger.info('audit-export worker: stopped');
  }
}

export const AUDIT_EXPORT_QUEUE_NAME = QUEUE_AUDIT_EXPORT;