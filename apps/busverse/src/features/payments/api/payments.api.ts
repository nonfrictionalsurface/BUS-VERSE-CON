import { api } from '@/lib/api/client';

export interface InitiatePaymentResponse {
  paymentId: string;
  checkoutUrl: string;
  status: string;
}

export const paymentsApi = {
  initiatePayment: async (bookingId: string): Promise<InitiatePaymentResponse> => {
    // RULE 8.6: Fresh Idempotency-Key UUID on every user retry
    const idempotencyKey = crypto.randomUUID();
    const res = await api.post<InitiatePaymentResponse>(
      '/passenger/payments',
      { bookingId, method: 'UPI' },
      { idempotencyKey }
    );
    return res.data;
  },

  getPaymentStatus: async (paymentId: string) => {
    const res = await api.get<{ status: string; paymentId: string }>(`/passenger/payments/${paymentId}`);
    return res.data;
  },

  mockConfirmPaymentDev: async (paymentId: string) => {
    const res = await api.post<{ status: string; paymentId: string }>('/dev/mock-confirm-payment', { paymentId });
    return res.data;
  },
};
