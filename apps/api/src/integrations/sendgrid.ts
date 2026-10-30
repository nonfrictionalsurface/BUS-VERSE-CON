import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string; // text content; Phase 8 adds HTML
  template?: string;
}

export interface EmailAdapter {
  send(msg: EmailMessage): Promise<void>;
}

/**
 * Dev/demo mode: log to Pino. Used when MOCK_EMAIL=true.
 */
class MockEmailAdapter implements EmailAdapter {
  async send(msg: EmailMessage): Promise<void> {
    logger.info({ to: msg.to, subject: msg.subject, body: msg.body, template: msg.template }, '[MOCK EMAIL]');
  }
}

/**
 * Real SendGrid adapter. Phase 2: simulated. Phase 8: wire real HTTP calls.
 */
class SendgridEmailAdapter implements EmailAdapter {
  async send(msg: EmailMessage): Promise<void> {
    if (!env.SENDGRID_API_KEY) {
      throw new Error('SendGrid not configured (SENDGRID_API_KEY missing)');
    }
    logger.warn({ to: msg.to }, 'SendGrid real send not yet implemented — logging instead');
    logger.info({ to: msg.to, subject: msg.subject, body: msg.body, template: msg.template }, '[SENDGRID SIMULATED]');
  }
}

export const emailAdapter: EmailAdapter = env.MOCK_EMAIL
  ? new MockEmailAdapter()
  : new SendgridEmailAdapter();