/**
 * Payment Transaction Contracts
 * Contract Reference: 07-API-AND-REALTIME-CONTRACTS.md Section 4.6
 */

export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING';

export interface InitiatePaymentRequest {
  bookingId: string;
  method: PaymentMethod;
}

export interface PaymentInitiationResponse {
  paymentId: string;
  orderId?: string;
  amountPaise: number;
  status: 'INITIATED' | 'CAPTURED' | 'FAILED';
  checkoutUrl?: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  bookingId: string;
  status: 'INITIATED' | 'CAPTURED' | 'FAILED';
  amountPaise: number;
  method: PaymentMethod;
  capturedAt?: string;
}