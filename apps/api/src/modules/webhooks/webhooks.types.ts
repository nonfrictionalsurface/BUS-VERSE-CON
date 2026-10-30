// Webhook module — types only. No runtime imports.

export type WebhookEventType = 'payment.captured' | 'payment.failed' | 'refund.processed' | 'refund.failed';

export interface RazorpayPaymentEntity {
  id: string;
  order_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  method?: string | null;
}

export interface RazorpayRefundEntity {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
}

export interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    refund?: { entity: RazorpayRefundEntity };
  };
}

export type WebhookProcessStatus = 'processed' | 'duplicate' | 'ignored';

export interface WebhookProcessResult {
  status: WebhookProcessStatus;
  eventType: string;
  paymentId?: string;
}