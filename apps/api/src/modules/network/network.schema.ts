import { z } from 'zod';
import { BUS_TYPE, SEAT_TYPE, SCHEDULE_STATUS, BOOKING_STATUS } from './network.types.js';

export const listCitiesQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const cityIdParamSchema = z.object({ id: z.string().uuid() });
export const searchQuerySchema = z.object({
  originCityId: z.string().uuid(),
  destinationCityId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sortBy: z.enum(['departureTime','fare']).default('departureTime'),
});
export const scheduleIdParamSchema = z.object({ id: z.string().uuid() });

export const patchOperatorMeSchema = z.object({ companyName: z.string().trim().min(2).max(200).optional() }).refine((v) => Object.keys(v).length > 0);

export const busIdParamSchema = z.object({ id: z.string().uuid() });
export const listBusesQuerySchema = z.object({ status: z.enum(['PENDING','APPROVED','REJECTED']).optional() });
export const createBusSchema = z.object({
  registrationNumber: z.string().trim().min(5).max(20).regex(/^[A-Z0-9-]+$/i, 'Invalid registration number'),
  model: z.string().trim().min(1).max(100).optional(),
  capacity: z.number().int().min(1).max(60),
  busType: z.enum(BUS_TYPE),
  amenities: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  insuranceDocRef: z.string().trim().min(1).max(200).optional(),
  insuranceExpiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export const patchBusSchema = z.object({
  model: z.string().trim().min(1).max(100).optional(),
  amenities: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  insuranceDocRef: z.string().trim().min(1).max(200).optional(),
  insuranceExpiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine((v) => Object.keys(v).length > 0);

const seatInputSchema = z.object({
  seatRow: z.string().trim().regex(/^[A-T]$/),
  seatColumn: z.number().int().min(1).max(6),
  seatType: z.enum(SEAT_TYPE),
  isFemaleOnly: z.boolean().default(false),
});
export const putSeatLayoutSchema = z.object({
  rowsCount: z.number().int().min(1).max(20),
  columnsCount: z.number().int().min(1).max(6),
  seats: z.array(seatInputSchema).min(1).max(120),
});

export const routeIdParamSchema = z.object({ id: z.string().uuid() });
const routeStandInputSchema = z.object({
  standId: z.string().uuid(),
  sequence: z.number().int().min(1),
  distanceFromPrevKm: z.number().min(0),
  durationFromPrevMin: z.number().int().min(0),
});
export const listRoutesQuerySchema = z.object({ status: z.enum(['PENDING','APPROVED','REJECTED']).optional() });
export const createRouteSchema = z.object({
  originCityId: z.string().uuid(),
  destinationCityId: z.string().uuid(),
  stands: z.array(routeStandInputSchema).min(2),
}).refine((v) => v.originCityId !== v.destinationCityId);
export const patchRouteSchema = z.object({ stands: z.array(routeStandInputSchema).min(2) });
export const appendRouteStandSchema = z.object({
  standId: z.string().uuid(),
  distanceFromPrevKm: z.number().min(0),
  durationFromPrevMin: z.number().int().min(0),
});

export const listSchedulesQuerySchema = z.object({
  status: z.enum(SCHEDULE_STATUS).optional(),
  busId: z.string().uuid().optional(),
  routeId: z.string().uuid().optional(),
});
const isoDateTime = z.string().datetime({ offset: true });
export const createScheduleSchema = z.object({
  busId: z.string().uuid(),
  routeId: z.string().uuid(),
  departureTime: isoDateTime,
  arrivalTime: isoDateTime,
  fareAmountPaise: z.number().int().min(1),
  fareCurrency: z.string().length(3).default('INR'),
}).refine((v) => new Date(v.arrivalTime).getTime() > new Date(v.departureTime).getTime());
export const patchScheduleSchema = z.object({
  departureTime: isoDateTime.optional(),
  arrivalTime: isoDateTime.optional(),
  fareAmountPaise: z.number().int().min(1).optional(),
}).refine((v) => Object.keys(v).length > 0);

// ---------- Phase 3c ----------
export const driverIdParamSchema = z.object({ id: z.string().uuid() });
export const listDriversQuerySchema = z.object({
  status: z.enum(['INVITED','SIGNED_UP','KYC_PENDING','VERIFIED','KYC_FAILED','ACTIVE','BLOCKED','DEACTIVATED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const inviteDriverSchema = z.object({
  phone: z.string().trim().min(10).max(20).regex(/^\+?[1-9]\d{1,14}$/),
  licenseNumber: z.string().trim().min(3).max(20),
  name: z.string().trim().min(1).max(100),
});

export const bookingIdParamSchema = z.object({ id: z.string().uuid() });
export const listBookingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.enum(BOOKING_STATUS).optional(),
  scheduleId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const revenueQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupBy: z.enum(['day','week','month']).default('day'),
});
// ---------- Phase 13: Operator trip assignment ----------
export const tripIdParamSchema = z.object({ id: z.string().uuid() });

export const assignTripBodySchema = z
  .object({
    scheduleId: z.string().uuid(),
    driverId: z.string().uuid(),
  })
  .strict();

export const reassignTripBodySchema = z
  .object({
    driverId: z.string().uuid(),
  })
  .strict();

export const listOperatorTripsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.enum(['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED']).optional(),
  driverId: z.string().uuid().optional(),
  busId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});