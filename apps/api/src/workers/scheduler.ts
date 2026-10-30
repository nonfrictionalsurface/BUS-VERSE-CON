import { logger } from '../lib/logger.js';
import { getCronQueue } from './queue.js';
import { JOB_PURGE_GPS_PARTITIONS, JOB_PURGE_SESSIONS, JOB_PURGE_OTP_CHALLENGES,
  JOB_PURGE_GATEWAY_WEBHOOKS, JOB_PURGE_SEAT_LOCKS, JOB_PURGE_IDEMPOTENCY_KEYS,
  JOB_RESET_STALE_ON_DUTY, JOB_PURGE_PASSWORD_RESET_TOKENS,
  JOB_EXPIRE_PENDING_BOOKINGS, JOB_ENSURE_SEQUENCES } from './types.js';
import { runPurgeGpsPartitions } from './jobs/purge-gps-partitions.job.js';
import { runPurgeSessions } from './jobs/purge-sessions.job.js';
import { runPurgeOtpChallenges } from './jobs/purge-otp-challenges.job.js';
import { runPurgeGatewayWebhooks } from './jobs/purge-gateway-webhooks.job.js';
import { runPurgeSeatLocks } from './jobs/purge-seat-locks.job.js';
import { runPurgeIdempotencyKeys } from './jobs/purge-idempotency-keys.job.js';
import { runResetStaleOnDuty } from './jobs/reset-stale-on-duty.job.js';
import { runPurgePasswordResetTokens } from './jobs/purge-password-reset-tokens.job.js';
import { runExpirePendingBookings } from './jobs/expire-pending-bookings.job.js';
import { runEnsureSequences } from './jobs/ensure-sequences.job.js';

type JobFn = () => Promise<unknown>;

export const CRON_JOBS: ReadonlyArray<{ id: string; name: string; pattern: string; fn: JobFn }> = [
  { id: 'nightly-purge-gps-partitions', name: JOB_PURGE_GPS_PARTITIONS, pattern: '0 2 * * *', fn: runPurgeGpsPartitions },
  { id: 'nightly-purge-sessions', name: JOB_PURGE_SESSIONS, pattern: '0 2 * * *', fn: runPurgeSessions },
  { id: 'nightly-purge-otp-challenges', name: JOB_PURGE_OTP_CHALLENGES, pattern: '0 2 * * *', fn: runPurgeOtpChallenges },
  { id: 'nightly-purge-gateway-webhooks', name: JOB_PURGE_GATEWAY_WEBHOOKS, pattern: '0 2 * * *', fn: runPurgeGatewayWebhooks },
  { id: 'nightly-purge-seat-locks', name: JOB_PURGE_SEAT_LOCKS, pattern: '0 2 * * *', fn: runPurgeSeatLocks },
  { id: 'nightly-purge-idempotency-keys', name: JOB_PURGE_IDEMPOTENCY_KEYS, pattern: '0 2 * * *', fn: runPurgeIdempotencyKeys },
  { id: 'nightly-reset-stale-on-duty', name: JOB_RESET_STALE_ON_DUTY, pattern: '0 2 * * *', fn: runResetStaleOnDuty },
  { id: 'nightly-purge-password-reset-tokens', name: JOB_PURGE_PASSWORD_RESET_TOKENS, pattern: '0 2 * * *', fn: runPurgePasswordResetTokens },
  { id: 'interval-expire-pending-bookings', name: JOB_EXPIRE_PENDING_BOOKINGS, pattern: '*/5 * * * *', fn: runExpirePendingBookings },
  { id: 'annual-ensure-sequences-nov', name: JOB_ENSURE_SEQUENCES, pattern: '0 0 1 11 *', fn: runEnsureSequences },
  { id: 'annual-ensure-sequences-mar', name: JOB_ENSURE_SEQUENCES, pattern: '0 0 1 3 *', fn: runEnsureSequences },
];
export async function registerCronSchedules(): Promise<{ registered: number }> {
  const queue = getCronQueue();
  for (const spec of CRON_JOBS) {
    await queue.upsertJobScheduler(spec.id, { pattern: spec.pattern }, { name: spec.name, data: { jobName: spec.name } });
  }
  logger.info({ count: CRON_JOBS.length }, 'scheduler: cron schedules registered');
  return { registered: CRON_JOBS.length };
}

export const CRON_DISPATCH: ReadonlyMap<string, JobFn> = new Map(
  CRON_JOBS.map((spec) => [spec.name, spec.fn] as const),
);

let cronWorkerStarted = false;

export async function startScheduler(): Promise<void> {
  if (cronWorkerStarted) return;
  await registerCronSchedules();
  cronWorkerStarted = true;
  logger.info('scheduler: started');
}

export function stopScheduler(): void {
  cronWorkerStarted = false;
  logger.info('scheduler: stopped');
}