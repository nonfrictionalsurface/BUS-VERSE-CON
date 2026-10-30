import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface SmsMessage {
  phone: string; // E.164
  body: string;
  template?: string;
}

export interface SmsAdapter {
  send(msg: SmsMessage): Promise<void>;
}

/**
 * Dev/demo mode: log to Pino, don't actually send.
 * Used when MOCK_OTP=true (see .env).
 */
class MockSmsAdapter implements SmsAdapter {
  async send(msg: SmsMessage): Promise<void> {
    logger.info({ to: msg.phone, body: msg.body, template: msg.template }, '[MOCK SMS]');
  }
}

/**
 * Real MSG91 adapter. Phase 2: simulated (logs). Phase 8: wire real HTTP calls.
 * If MOCK_OTP=false but MSG91 creds are missing, throws — forcing config.
 */
class Msg91SmsAdapter implements SmsAdapter {
  async send(msg: SmsMessage): Promise<void> {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_SENDER_ID) {
      throw new Error('MSG91 not configured (MSG91_AUTH_KEY / MSG91_SENDER_ID missing)');
    }
    // Phase 8 will replace this with a real HTTP POST to MSG91.
    logger.warn({ to: msg.phone }, 'MSG91 real send not yet implemented — logging instead');
    logger.info({ to: msg.phone, body: msg.body, template: msg.template }, '[MSG91 SIMULATED]');
  }
}

export const smsAdapter: SmsAdapter = env.MOCK_OTP
  ? new MockSmsAdapter()
  : new Msg91SmsAdapter();