import { errors } from '../../lib/errors.js';

export const paymentErrors = {
  notFound: () => errors.notFound('Payment not found'),
  notAllowed: (currentStatus?: string) => errors.paymentNotAllowed(currentStatus),
  alreadySucceeded: () => errors.paymentAlreadySucceeded(),
  idempotencyReused: () => errors.idempotencyKeyReused(),
  gatewayTimeout: () => errors.gatewayTimeout(),
};