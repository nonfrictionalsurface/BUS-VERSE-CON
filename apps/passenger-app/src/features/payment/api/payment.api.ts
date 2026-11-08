import { api, EP } from '../../../lib/api';
import type { PaymentDTO } from '../../../types';

/** One idempotency key per booking: retrying after a network error returns the same order. */
export const initiatePayment = (bookingId: string) =>
  api.post<PaymentDTO>(EP.paymentCreate, { bookingId }, { idempotencyKey: `pay-${bookingId}` });

export const getPayment = (paymentId: string) => api.get<PaymentDTO>(EP.payment(paymentId));

/** Development only (the API does not register this route in production). */
export const mockConfirmPayment = (paymentId: string) => api.post<unknown>('/dev/mock-confirm-payment', { paymentId });
