// Worker job names + payload types. No runtime imports.

export const QUEUE_CRON = 'cron';
export const QUEUE_WEBHOOK_REPLAY = 'webhook-replay';
export const QUEUE_AUDIT_EXPORT = 'audit-export';

export const JOB_PURGE_GPS_PARTITIONS = 'purge-gps-partitions';
export const JOB_PURGE_SESSIONS = 'purge-sessions';
export const JOB_PURGE_OTP_CHALLENGES = 'purge-otp-challenges';
export const JOB_PURGE_GATEWAY_WEBHOOKS = 'purge-gateway-webhooks';
export const JOB_PURGE_SEAT_LOCKS = 'purge-seat-locks';
export const JOB_PURGE_IDEMPOTENCY_KEYS = 'purge-idempotency-keys';
export const JOB_RESET_STALE_ON_DUTY = 'reset-stale-on-duty';
export const JOB_PURGE_PASSWORD_RESET_TOKENS = 'purge-password-reset-tokens';
export const JOB_EXPIRE_PENDING_BOOKINGS = 'expire-pending-bookings';
export const JOB_ENSURE_SEQUENCES = 'ensure-sequences';
export const JOB_REPLAY_WEBHOOK = 'replay-webhook';
export const JOB_AUDIT_EXPORT = 'audit-export';

export interface CronJobData {
  jobName: string;
}
export interface AuditExportFilters {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export interface AuditExportJobData {
  filters: AuditExportFilters;
}