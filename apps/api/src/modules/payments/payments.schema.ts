import { z } from 'zod';

export const initiatePaymentBodySchema = z
  .object({
    bookingId: z.string().uuid(),
    method: z.enum(['UPI', 'CARD', 'NETBANKING', 'WALLET', 'EMI']).optional(),
  })
  .strict();

export const paymentIdParamSchema = z.object({ id: z.string().uuid() });