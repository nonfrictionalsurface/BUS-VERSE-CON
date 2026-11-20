# API Contracts Appendix - part 1

Extracted verbatim from the source files named in each heading. If this file and the code ever disagree, the code wins.
Companion to `FRONTEND-IMPLEMENTATION-GUIDE.md`. Part 1: error codes, route table, request schemas. Part 2: response types, realtime, seat engine.

## A.1 Error codes (`apps/api/src/lib/errors.ts`)

| Code | HTTP | Default message |
|------|------|-----------------|
| ACTIVE_TRIP_EXISTS | 409 | Driver already has an active trip |
| BOOKING_IMMUTABLE | 400 | Booking is immutable after confirmation |
| BOOKING_REFERENCE_COLLISION | 500 | Reference collision, retry |
| BUS_LAYOUT_MISSING | 403 | Bus has no seat layout configured |
| BUS_NOT_APPROVED | 403 | Bus is not approved |
| BUS_REGISTRATION_EXISTS | 409 | Bus registration exists |
| DRIVER_BLOCKED | 403 | Driver account is blocked or deactivated |
| DRIVER_NOT_VERIFIED | 403 | Driver KYC is not verified |
| DRIVER_ON_DUTY | 409 | Driver is on duty |
| EMAIL_ALREADY_REGISTERED | 409 | Email already registered |
| EMAIL_NOT_VERIFIED | 403 | Email not verified |
| EMAIL_SIGNUP_NOT_SUPPORTED | 400 | Email signup not supported |
| GSTIN_ALREADY_REGISTERED | 409 | GSTIN already registered |
| IDEMPOTENCY_KEY_REUSED | 409 | Idempotency key reused with different body |
| INVALID_ACCURACY | 400 | GPS accuracy too poor (>100m) |
| INVALID_CAPACITY | 400 | Invalid capacity |
| INVALID_COORDINATES | 400 | Invalid GPS coordinates |
| INVALID_CREDENTIALS | 401 | Invalid credentials |
| INVALID_EMAIL_FORMAT | 400 | Invalid email format |
| INVALID_OTP | 400 | Invalid OTP |
| INVALID_PHONE_FORMAT | 400 | Invalid phone format |
| INVALID_SCHEDULE | 400 | Schedule is not published or does not exist |
| INVALID_SCHEDULE_TIMES | 400 | Arrival must be after departure |
| INVALID_SEAT | 400 | Seat does not belong to this schedule |
| INVALID_SIGNATURE | 400 | QR signature is invalid |
| INVOICE_NUMBER_COLLISION | 500 | Invoice collision, retry |
| LAYOUT_IN_USE | 409 | Seat layout change conflicts with active bookings or seat locks |
| LICENSE_ALREADY_REGISTERED | 409 | License already registered |
| LICENSE_EXPIRED | 403 | License expired |
| LOCK_EXPIRED | 400 | Seat lock has expired |
| LOCK_NOT_FOUND | 400 | Seat lock not found or does not belong to you |
| OTP_ATTEMPTS_EXCEEDED | 429 | Too many OTP attempts |
| OTP_EXPIRED | 400 | OTP expired |
| PAYMENT_ALREADY_SUCCEEDED | 409 | Payment already succeeded |
| PAYMENT_NOT_ALLOWED | 400 | Payment not allowed in current booking state |
| PAYMENT_NOT_REFUNDABLE | 400 | Payment not refundable |
| PHONE_ALREADY_REGISTERED | 409 | Phone already registered |
| REFRESH_TOKEN_REPLAYED | 401 | Refresh token replayed |
| REFUND_EXCEEDS_PAYMENT | 400 | Refund exceeds payment amount |
| RESET_TOKEN_EXPIRED | 400 | Reset token expired |
| RESET_TOKEN_INVALID | 400 | Invalid reset token |
| ROUTE_IN_USE | 409 | Route in use by schedules |
| ROUTE_SAME_CITY | 400 | Origin and destination must differ |
| SCAN_EXPIRED | 400 | Scan too old |
| SCHEDULE_CANCELLED | 409 | Schedule has been cancelled |
| SCHEDULE_CONFLICT | 409 | Bus has an overlapping schedule |
| SCHEDULE_DEPARTED | 409 | Schedule has already departed |
| SCHEDULE_HAS_BOOKINGS | 409 | Schedule has bookings |
| SEAT_ALREADY_BOOKED | 409 | Seat already booked |
| SEAT_LOCKED | 409 | Seat locked |
| SESSION_REVOKED | 401 | Session revoked |
| TELEPORT_DETECTED | 400 | Implied speed exceeds plausible maximum |
| TRIP_ALREADY_STARTED | 409 | Trip already started |
| TRIP_NOT_ACTIVE | 409 | Trip is not active (completed or cancelled) |
| TRIP_NOT_ASSIGNED | 403 | Trip not assigned |
| TRIP_NOT_IN_PROGRESS | 409 | Trip is not in progress |

## A.2 Route table (generated from the routers)

All paths are under `/v1`. `public` needs no token.

| Module | Method | Path | Access | Handler |
|--------|--------|------|--------|---------|
| admin | GET | `/v1/admin/operators` | role: 'SUPER_ADMIN' | listOperators |
| admin | GET | `/v1/admin/operators/:id` | role: 'SUPER_ADMIN' | getOperator |
| admin | POST | `/v1/admin/operators/:id/approve` | role: 'SUPER_ADMIN' | approveOperator |
| admin | POST | `/v1/admin/operators/:id/reject` | role: 'SUPER_ADMIN' | rejectOperator |
| admin | POST | `/v1/admin/operators/:id/suspend` | role: 'SUPER_ADMIN' | suspendOperator |
| admin | GET | `/v1/admin/buses` | role: 'SUPER_ADMIN' | listBuses |
| admin | POST | `/v1/admin/buses/:id/approve` | role: 'SUPER_ADMIN' | approveBus |
| admin | POST | `/v1/admin/buses/:id/reject` | role: 'SUPER_ADMIN' | rejectBus |
| admin | GET | `/v1/admin/routes` | role: 'SUPER_ADMIN' | listRoutes |
| admin | POST | `/v1/admin/routes/:id/approve` | role: 'SUPER_ADMIN' | approveRoute |
| admin | GET | `/v1/admin/schedules` | role: 'SUPER_ADMIN' | listSchedules |
| admin | POST | `/v1/admin/schedules/:id/approve` | role: 'SUPER_ADMIN' | approveSchedule |
| admin | GET | `/v1/admin/bookings` | role: 'SUPER_ADMIN' | listBookings |
| admin | GET | `/v1/admin/bookings/:id` | role: 'SUPER_ADMIN' | getBooking |
| admin | GET | `/v1/admin/dashboard` | role: 'SUPER_ADMIN' | getDashboard |
| admin | GET | `/v1/admin/payments` | role: 'SUPER_ADMIN' | listPayments |
| admin | GET | `/v1/admin/payments/:id` | role: 'SUPER_ADMIN' | getPayment |
| admin | POST | `/v1/admin/payments/:id/refund` | role: 'SUPER_ADMIN' | refundPayment |
| admin | GET | `/v1/admin/refunds` | role: 'SUPER_ADMIN' | listRefunds |
| audit | GET | `/v1/admin/audit-logs` | signed-in (role checked in the handler/service) | getAuditLogs |
| audit | GET | `/v1/admin/audit-logs/export` | signed-in (role checked in the handler/service) | getAuditLogsExport |
| audit | POST | `/v1/admin/audit-logs/export-async` | signed-in (role checked in the handler/service) | postAuditLogsExportAsync |
| audit | GET | `/v1/admin/audit-logs/export-async/:jobId` | signed-in (role checked in the handler/service) | getAuditLogsExportStatus |
| booking | GET | `/v1/passenger/schedules/:id/availability` | signed-in (role checked in the handler/service) | getAvailability |
| booking | POST | `/v1/passenger/seat-locks` | signed-in (role checked in the handler/service) | postSeatLock |
| booking | GET | `/v1/passenger/seat-locks/active` | signed-in (role checked in the handler/service) | getActiveLocks |
| booking | DELETE | `/v1/passenger/seat-locks/:id` | signed-in (role checked in the handler/service) | deleteSeatLock |
| booking | POST | `/v1/passenger/bookings` | signed-in (role checked in the handler/service) | postBooking |
| booking | GET | `/v1/passenger/bookings` | signed-in (role checked in the handler/service) | getMyBookings |
| booking | GET | `/v1/passenger/bookings/:id` | signed-in (role checked in the handler/service) | getMyBooking |
| booking | GET | `/v1/passenger/bookings/:id/ticket` | signed-in (role checked in the handler/service) | getBookingTicket |
| booking | GET | `/v1/passenger/bookings/:id/refund-preview` | signed-in (role checked in the handler/service) | getRefundPreview |
| booking | POST | `/v1/passenger/bookings/:id/cancel` | signed-in (role checked in the handler/service) | postCancelBooking |
| booking | GET | `/v1/passenger/trips/:id/live` | signed-in (role checked in the handler/service) | getLive |
| booking | GET | `/v1/passenger/trips/:id/map` | signed-in (role checked in the handler/service) | getMap |
| identity | POST | `/v1/passenger/auth/otp/request` | public | postPassengerOtpRequest |
| identity | POST | `/v1/passenger/auth/otp/verify` | public | postPassengerOtpVerify |
| identity | GET | `/v1/passenger/me` | role: 'REGISTERED_PASSENGER' | getPassengerMe |
| identity | POST | `/v1/driver/auth/otp/request` | public | postDriverOtpRequest |
| identity | POST | `/v1/driver/auth/otp/verify` | public | postDriverOtpVerify |
| identity | POST | `/v1/operator/auth/signup` | public | postOperatorSignup |
| identity | POST | `/v1/operator/auth/login` | public | postOperatorLogin |
| identity | POST | `/v1/operator/auth/otp/request` | public | postOperatorOtpRequest |
| identity | POST | `/v1/operator/auth/otp/verify` | public | postOperatorOtpVerify |
| identity | POST | `/v1/operator/auth/reset/request` | public | postOperatorResetRequest |
| identity | POST | `/v1/operator/auth/reset/verify` | public | postOperatorResetVerify |
| identity | POST | `/v1/admin/auth/login` | public | postAdminLogin |
| identity | POST | `/v1/admin/auth/reset/request` | public | postAdminResetRequest |
| identity | POST | `/v1/admin/auth/reset/verify` | public | postAdminResetVerify |
| identity | POST | `/v1/:surface/auth/refresh` | public | postRefresh |
| identity | POST | `/v1/:surface/auth/logout` | public | postLogout |
| network | GET | `/v1/public/cities` | public | listCities |
| network | GET | `/v1/public/cities/:id/stands` | public | listCityStands |
| network | GET | `/v1/public/search` | public | searchPublic |
| network | GET | `/v1/public/schedules/:id` | public | getScheduleDetail |
| network | GET | `/v1/operator/me` | role: ...OPERATOR_ROLES | getOperatorMe |
| network | GET | `/v1/operator/me/managers` | role: 'OPERATOR_OWNER' | listManagers |
| network | PATCH | `/v1/operator/me` | role: 'OPERATOR_OWNER' | patchOperatorMe |
| network | GET | `/v1/operator/buses` | role: ...OPERATOR_ROLES | listBuses |
| network | POST | `/v1/operator/buses` | role: ...OPERATOR_ROLES | createBus |
| network | GET | `/v1/operator/buses/:id` | role: ...OPERATOR_ROLES | getBus |
| network | PATCH | `/v1/operator/buses/:id` | role: ...OPERATOR_ROLES | patchBus |
| network | DELETE | `/v1/operator/buses/:id` | role: ...OPERATOR_ROLES | deleteBus |
| network | GET | `/v1/operator/buses/:id/layout` | role: ...OPERATOR_ROLES | getSeatLayout |
| network | PUT | `/v1/operator/buses/:id/layout` | role: ...OPERATOR_ROLES | putSeatLayout |
| network | POST | `/v1/operator/buses/:id/layout/validate` | role: ...OPERATOR_ROLES | validateSeatLayout |
| network | GET | `/v1/operator/routes` | role: ...OPERATOR_ROLES | listRoutes |
| network | POST | `/v1/operator/routes` | role: ...OPERATOR_ROLES | createRoute |
| network | GET | `/v1/operator/routes/:id` | role: ...OPERATOR_ROLES | getRoute |
| network | PATCH | `/v1/operator/routes/:id` | role: ...OPERATOR_ROLES | patchRoute |
| network | POST | `/v1/operator/routes/:id/stands` | role: ...OPERATOR_ROLES | appendRouteStand |
| network | DELETE | `/v1/operator/routes/:id` | role: ...OPERATOR_ROLES | deleteRoute |
| network | GET | `/v1/operator/schedules` | role: ...OPERATOR_ROLES | listSchedules |
| network | POST | `/v1/operator/schedules` | role: ...OPERATOR_ROLES | createSchedule |
| network | GET | `/v1/operator/schedules/:id` | role: ...OPERATOR_ROLES | getSchedule |
| network | PATCH | `/v1/operator/schedules/:id` | role: ...OPERATOR_ROLES | patchSchedule |
| network | POST | `/v1/operator/schedules/:id/publish` | role: ...OPERATOR_ROLES | publishSchedule |
| network | GET | `/v1/operator/drivers` | role: ...OPERATOR_ROLES | listDrivers |
| network | POST | `/v1/operator/drivers/invite` | role: ...OPERATOR_ROLES | inviteDriver |
| network | GET | `/v1/operator/drivers/:id` | role: ...OPERATOR_ROLES | getDriver |
| network | DELETE | `/v1/operator/drivers/:id` | role: ...OPERATOR_ROLES | deleteDriver |
| network | GET | `/v1/operator/bookings` | role: ...OPERATOR_ROLES | listBookings |
| network | GET | `/v1/operator/bookings/:id` | role: ...OPERATOR_ROLES | getBooking |
| network | GET | `/v1/operator/dashboard` | role: ...OPERATOR_ROLES | getDashboard |
| network | GET | `/v1/operator/revenue` | role: ...OPERATOR_ROLES | getRevenue |
| network | GET | `/v1/operator/revenue/daily` | role: ...OPERATOR_ROLES | getRevenueDaily |
| network | GET | `/v1/operator/settlements` | role: ...OPERATOR_ROLES | listSettlements |
| network | POST | `/v1/operator/trips` | role: ...OPERATOR_ROLES | assignTrip |
| network | GET | `/v1/operator/trips` | role: ...OPERATOR_ROLES | listOperatorTrips |
| network | GET | `/v1/operator/trips/:id` | role: ...OPERATOR_ROLES | getOperatorTrip |
| network | PATCH | `/v1/operator/trips/:id` | role: ...OPERATOR_ROLES | patchOperatorTrip |
| network | DELETE | `/v1/operator/trips/:id` | role: ...OPERATOR_ROLES | deleteOperatorTrip |
| payments | POST | `/v1/passenger/payments` | signed-in (role checked in the handler/service) | postPayment |
| payments | GET | `/v1/passenger/payments/:id` | signed-in (role checked in the handler/service) | getPaymentStatusHandler |
| trip | GET | `/v1/driver/config` | signed-in (role checked in the handler/service) | getConfig |
| trip | GET | `/v1/driver/me` | signed-in (role checked in the handler/service) | getMe |
| trip | GET | `/v1/driver/trips` | signed-in (role checked in the handler/service) | getMyTrips |
| trip | GET | `/v1/driver/trips/history` | signed-in (role checked in the handler/service) | getHistory |
| trip | GET | `/v1/driver/trips/:id` | signed-in (role checked in the handler/service) | getTrip |
| trip | POST | `/v1/driver/trips/:id/start` | signed-in (role checked in the handler/service) | postStartTrip |
| trip | POST | `/v1/driver/trips/:id/end` | signed-in (role checked in the handler/service) | postEndTrip |
| trip | GET | `/v1/driver/trips/:id/manifest` | signed-in (role checked in the handler/service) | getManifest |
| trip | POST | `/v1/driver/trips/:id/gps` | signed-in (role checked in the handler/service) | postGps |
| trip | POST | `/v1/driver/trips/:id/scan` | signed-in (role checked in the handler/service) | postScan |
| trip | POST | `/v1/driver/trips/:id/delay` | signed-in (role checked in the handler/service) | postDelay |
| trip | POST | `/v1/driver/trips/:id/cancel` | signed-in (role checked in the handler/service) | postCancelTrip |
| trip | POST | `/v1/driver/uploads` | signed-in (role checked in the handler/service) | postDriverUploads |
| trip | POST | `/v1/driver/me/documents` | signed-in (role checked in the handler/service) | postDriverDocuments |
| webhooks | POST | `/v1/webhooks/razorpay` | public | postRazorpayWebhook |

## A.3a Identity: request schemas (`apps/api/src/modules/identity/identity.schema.ts`)

```ts
import { z } from 'zod';

const phoneSchema = z
  .string()
  .min(10)
  .max(20)
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone format');

const emailSchema = z.string().email().max(255);
const otpSchema = z.string().regex(/^\d{6}$/, 'OTP must be 6 digits');

const operatorPasswordSchema = z.string().min(12).max(128);
const adminPasswordSchema = z.string().min(16).max(128);

export const passengerOtpRequestSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    intent: z.enum(['LOGIN', 'SIGNUP']),
  })
  .refine(
    (v) => (v.phone && !v.email) || (!v.phone && v.email),
    'Provide exactly one of phone or email',
  );

export const passengerOtpVerifySchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    otp: otpSchema,
  })
  .refine(
    (v) => (v.phone && !v.email) || (!v.phone && v.email),
    'Provide exactly one of phone or email',
  );

export const driverOtpRequestSchema = z.object({ phone: phoneSchema });

export const driverOtpVerifySchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
  deviceFingerprint: z.string().min(8).max(256),
});

export const operatorOtpRequestSchema = z.object({ phone: phoneSchema });

export const operatorOtpVerifySchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});

export const operatorLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const passwordResetRequestSchema = z
  .object({
    email: emailSchema.optional(),
    phone: phoneSchema.optional(),
  })
  .refine(
    (v) => (v.email && !v.phone) || (!v.email && v.phone),
    'Provide exactly one of email or phone',
  );

const resetVerifyBase = z
  .object({
    token: z.string().min(20).max(200).optional(),
    phone: phoneSchema.optional(),
    otp: otpSchema.optional(),
  })
  .refine((v) => {
    const hasToken = !!v.token;
    const hasOtp = !!(v.phone && v.otp);
    return hasToken !== hasOtp;
  }, 'Provide either token (email path) or phone+otp (fallback path), not both');

export const operatorPasswordResetVerifySchema = resetVerifyBase.and(
  z.object({ newPassword: operatorPasswordSchema }),
);

export const adminPasswordResetVerifySchema = resetVerifyBase.and(
  z.object({ newPassword: adminPasswordSchema }),
);

export const refreshSchema = z.object({});
export const logoutSchema = z.object({});

export const surfaceParamSchema = z.object({
  surface: z.enum(['passenger', 'driver', 'operator', 'admin']),
});
const gstinSchema = z
  .string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN format');

const panSchema = z
  .string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format');

export const operatorSignupSchema = z
  .object({
    companyName: z.string().min(2).max(200),
    gstin: gstinSchema,
    pan: panSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: operatorPasswordSchema,
  })
  .strict();
```

## A.3b Booking: request schemas (`apps/api/src/modules/booking/booking.schema.ts`)

```ts
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
```

## A.3c Payments: request schemas (`apps/api/src/modules/payments/payments.schema.ts`)

```ts
import { z } from 'zod';

export const initiatePaymentBodySchema = z
  .object({
    bookingId: z.string().uuid(),
    method: z.enum(['UPI', 'CARD', 'NETBANKING', 'WALLET', 'EMI']).optional(),
  })
  .strict();

export const paymentIdParamSchema = z.object({ id: z.string().uuid() });
```

## A.3d Driver trips: request schemas (`apps/api/src/modules/trip/trip.schema.ts`)

```ts
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
```

## A.3e Network (operator and public): request schemas (`apps/api/src/modules/network/network.schema.ts`)

```ts
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
  capacity: z.number().int().min(1).max(150),
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
/** Query options for the v2 layout endpoints (body is the v2 layout document itself). */
export const layoutOptionsQuerySchema = z.object({
  syncCapacity: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
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
```
