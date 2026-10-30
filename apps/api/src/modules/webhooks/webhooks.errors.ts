import { errors } from '../../lib/errors.js';

export const webhookErrors = {
  invalidSignature: () => errors.unauthorized('Invalid webhook signature'),
  invalidPayload: (msg = 'Invalid webhook payload shape') => errors.invalidRequest(msg),
};