import { z } from 'zod';

export const operatorIdParamSchema = z.object({ id: z.string().uuid() });
export const busIdParamSchema = z.object({ id: z.string().uuid() });
export const routeIdParamSchema = z.object({ id: z.string().uuid() });
export const scheduleIdParamSchema = z.object({ id: z.string().uuid() });
export const bookingIdParamSchema = z.object({ id: z.string().uuid() });

export const listOperatorsQuerySchema = z.object({
  status: z.enum(['APPLIED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ACTIVE', 'DEACTIVATED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listBusesQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  operatorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listRoutesQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  operatorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listSchedulesQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'EXPIRED']).optional(),
  operatorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listBookingsQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'OPERATOR_CANCELLED', 'REFUNDED', 'EXPIRED', 'FAILED']).optional(),
  userId: z.string().uuid().optional(),
  scheduleId: z.string().uuid().optional(),
  operatorId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const getBookingQuerySchema = z.object({
  includePii: z.enum(['true', 'false']).optional(),
  reason: z.string().trim().min(5).max(500).optional(),
});

export const actionReasonSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});
// ---------- Payments oversight (Phase 5) ----------

export const paymentIdParamSchema = z.object({ id: z.string().uuid() });

export const listPaymentsQuerySchema = z.object({
  status: z.enum(['INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'REFUNDED']).optional(),
  bookingId: z.string().uuid().optional(),
  operatorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listRefundsQuerySchema = z.object({
  status: z.enum(['INITIATED', 'PROCESSING', 'PROCESSED', 'FAILED']).optional(),
  paymentId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const refundPaymentBodySchema = z.object({
  amountPaise: z.coerce.number().int().positive(),
  reason: z.string().trim().min(5).max(500),
  refundReason: z.enum(['DISPUTE', 'DUPLICATE_CHARGE', 'TRIP_CANCELLED']).default('DISPUTE'),
}).strict();