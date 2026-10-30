import { z } from 'zod';
import {
  DELAY_REASON,
  DELAY_MIN_MINUTES,
  DELAY_MAX_MINUTES,
  DELAY_MAX_NOTES_LENGTH,
} from './trip.types.js';

export const tripIdParamSchema = z.object({ id: z.string().uuid() });

export const gpsBodySchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    speedKmh: z.number().min(0).max(300),
    accuracyM: z.number().min(0).max(1000),
    recordedAt: z.string().datetime(),
  })
  .strict();

export const delayBodySchema = z
  .object({
    reason: z.enum(DELAY_REASON),
    delayMinutes: z.number().int().min(DELAY_MIN_MINUTES).max(DELAY_MAX_MINUTES),
    notes: z.string().max(DELAY_MAX_NOTES_LENGTH).optional(),
  })
  .strict();

export const tripListQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
    .optional(),
});

export const historyQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const scanBodySchema = z
  .object({
    qrPayload: z.string().min(1).max(800).optional(),
    scannedAt: z.string().datetime(),
    scannedLat: z.number().min(-90).max(90).optional(),
    scannedLng: z.number().min(-180).max(180).optional(),
    manualEntry: z.boolean().optional(),
    bookingReference: z.string().min(1).max(30).optional(),
    primaryPassengerName: z.string().min(1).max(100).optional(),
  })
  .strict()
  .refine(
    (d) => {
      if (d.manualEntry) return !!d.bookingReference && !!d.primaryPassengerName;
      return !!d.qrPayload;
    },
    { message: 'Provide qrPayload, OR manualEntry + bookingReference + primaryPassengerName' },
  );
export const uploadUrlBodySchema = z
  .object({
    filename: z.string().min(1).max(200),
    contentType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
    purpose: z.enum(['DRIVER_LICENSE', 'GOVERNMENT_ID', 'PROFILE_PHOTO']),
  })
  .strict();

export const attachDocsBodySchema = z
  .object({
    uploadIds: z.array(z.string().min(1).max(80)).min(1).max(3),
  })
  .strict();
export const cancelTripBodySchema = z
  .object({
    reason: z.string().min(5).max(500),
  })
  .strict();