import { z } from 'zod';

const paymentEntity = z.object({
  id: z.string().min(1),
  order_id: z.string().nullish(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  method: z.string().nullish(),
});

const refundEntity = z.object({
  id: z.string().min(1),
  payment_id: z.string().min(1),
  amount: z.number(),
  status: z.string(),
});

export const razorpayWebhookSchema = z.object({
  event: z.string().min(1),  // dispatched in webhooks.service.ts; unknown events are ignored
  payload: z.object({
    payment: z.object({ entity: paymentEntity }).optional(),
    refund: z.object({ entity: refundEntity }).optional(),
  }),
});