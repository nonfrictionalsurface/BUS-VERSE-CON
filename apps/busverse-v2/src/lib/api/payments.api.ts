import { api } from '@/lib/api/client';

export interface InitiatePaymentResponse {
  paymentId: string;
  checkoutUrl?: string;
  status: 'INITIATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED';
  amountPaise?: number;
  expiresAt?: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  status: 'INITIATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED';
  bookingId?: string;
  amountPaise?: number;
  method?: string;
}

/**
 * Generates a UUID v4 to use as an Idempotency-Key.
 * Backend requires min 8 chars; UUID is 36 chars.
 */
function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  // Fallback for older browsers — RFC 4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizePayment(raw: any): PaymentStatusResponse {
  return {
    paymentId: String(raw?.paymentId ?? raw?.id ?? ''),
    status: (raw?.status ?? 'INITIATED') as PaymentStatusResponse['status'],
    bookingId: raw?.bookingId,
    amountPaise: raw?.amountPaise ?? raw?.amount,
    method: raw?.method,
  };
}

export const paymentsApi = {
  async initiate(bookingId: string): Promise<InitiatePaymentResponse> {
    // ⭐ Backend requires a fresh Idempotency-Key per payment attempt
    const idempotencyKey = generateIdempotencyKey();
    console.log(
      '[payments] Initiating payment with Idempotency-Key:',
      idempotencyKey.slice(0, 8) + '…',
    );

    const raw = await api.post<any>(
      '/passenger/payments',
      { bookingId },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    );

    return {
      paymentId: String(raw.paymentId ?? raw.id ?? ''),
      checkoutUrl: raw.checkoutUrl,
      status: (raw.status ?? 'INITIATED') as InitiatePaymentResponse['status'],
      amountPaise: raw.amountPaise ?? raw.amount,
      expiresAt: raw.expiresAt,
    };
  },

  async getStatus(paymentId: string): Promise<PaymentStatusResponse> {
    const raw = await api.get<any>(`/passenger/payments/${paymentId}`);
    return normalizePayment(raw);
  },

  /** Dev-only: simulates the payment.captured webhook */
  async mockConfirm(paymentId: string): Promise<void> {
    await api.post('/dev/mock-confirm-payment', { paymentId });
  },
};