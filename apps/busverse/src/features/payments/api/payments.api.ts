import { api } from '@/lib/api/client';
import { InitiatePaymentRequest, PaymentInitiationResponse, PaymentStatusResponse } from '../types';

export async function initiatePayment(payload: InitiatePaymentRequest): Promise<PaymentInitiationResponse> {
  // RULE 8.6: Payments REQUIRE a fresh unique Idempotency-Key on every attempt
  const idempotencyKey = crypto.randomUUID();
  const response = await api.post<PaymentInitiationResponse>('/passenger/payments', payload, {
    idempotencyKey,
  });
  return response.data;
}

export async function fetchPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
  const response = await api.get<PaymentStatusResponse>(`/passenger/payments/${paymentId}`);
  return response.data;
}

export async function devMockConfirmPayment(paymentId: string): Promise<{ status: string }> {
  // Development shortcut: Simulates Razorpay captured webhook on localhost
  const response = await api.post<{ status: string }>('/dev/mock-confirm-payment', {
    paymentId,
  });
  return response.data;
}