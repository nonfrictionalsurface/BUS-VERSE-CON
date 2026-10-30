import { logger } from '../../lib/logger.js';

export type IdentityEventType =
  | 'user_registered'
  | 'session_created'
  | 'session_revoked'
  | 'refresh_rotated'
  | 'refresh_replay_detected'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'consent_granted'
  | 'single_device_revoked'
  | 'operator_signup_submitted';

export interface IdentityEvent {
  type: IdentityEventType;
  userId?: string | undefined;
  sessionId?: string | undefined;
  ip?: string | undefined;
  userAgent?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export function emitIdentityEvent(event: IdentityEvent): void {
  logger.info(
    {
      identity_event: event.type,
      userId: event.userId,
      sessionId: event.sessionId,
      ip: event.ip,
      userAgent: event.userAgent,
      ...event.metadata,
    },
    `identity:${event.type}`,
  );
}