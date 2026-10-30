import { z } from 'zod';
import { PAYMENT_METHOD } from './booking.types.js';

// Params
export const scheduleIdParamSchema = z.object({ id: z.string().uuid() });
export const lockIdParamSchema = z.object({ id: z.string().uuid() });
export const bookingIdParamSchema = z.object({ id: z.string().uuid() });
export const paymentIdParamSchema = z.object({ id: z.string().uuid() });

// Seat lock
export const acquireLockSchema = z
  .object({
    scheduleId: z.string().uuid(),
    seatId: z.string().uuid(),
  })
  .strict();

// Booking create
export const passengerInputSchema = z
  .object({
    seatId: z.string().uuid(),
    name: z.string().trim().min(1).max(100),
    age: z.number().int().min(1).max(119).optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  })
  .strict();

export const createBookingSchema = z
  .object({
    lockId: z.string().uuid(),
    boardingStandId: z.string().uuid(),
    droppingStandId: z.string().uuid(),
    passengers: z.array(passengerInputSchema).min(1).max(8),
  })
  .strict()
  .refine((v) => v.boardingStandId !== v.droppingStandId, {
    message: 'Boarding and dropping stands must differ',
    path: ['droppingStandId'],
  })
  .refine(
    (v) => {
      const ids = v.passengers.map((p) => p.seatId);
      return new Set(ids).size === ids.length;
    },
    { message: 'Duplicate seatId in passengers', path: ['passengers'] },
  );

// Payments
export const initiatePaymentSchema = z
  .object({
    bookingId: z.string().uuid(),
    method: z.enum(PAYMENT_METHOD).optional(),
  })
  .strict();

export const mockConfirmSchema = z
  .object({
    paymentId: z.string().uuid(),
  })
  .strict();

// List query
export const listBookingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z
    .enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'OPERATOR_CANCELLED', 'REFUNDED', 'EXPIRED', 'FAILED'])
    .optional(),
});