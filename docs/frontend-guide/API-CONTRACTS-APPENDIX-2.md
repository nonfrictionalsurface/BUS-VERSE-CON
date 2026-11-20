# API Contracts Appendix - part 2

Extracted verbatim from the source files named in each heading. If this file and the code ever disagree, the code wins.
Companion to `FRONTEND-IMPLEMENTATION-GUIDE.md`. Part 1: error codes, route table, request schemas. Part 2: response types, realtime, seat engine.

## A.4a Identity: response types (`apps/api/src/modules/identity/identity.types.ts`)

```ts
export type OtpIntent = 'LOGIN' | 'SIGNUP';
export type AuthSurface = 'passenger' | 'operator' | 'driver' | 'admin';

export type Role =
  | 'GUEST'
  | 'REGISTERED_PASSENGER'
  | 'OPERATOR_OWNER'
  | 'OPERATOR_MANAGER'
  | 'DRIVER'
  | 'SUPER_ADMIN';

export interface UserDTO {
  id: string;
  phone: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/**
 * Flat shape per contract 07 section 3.3 - accessToken/refreshToken/expiresAt sit at
 * the top level of `data`, not nested under `tokens`.
 */
export interface LoginResult extends AuthTokens {
  user: UserDTO;
}

export interface RefreshResult extends AuthTokens {}

export interface OtpRequestResult {
  expiresInSeconds: number;
}

export const ACCESS_TTL_SECONDS: Record<Role, number> = {
  GUEST: 900,
  REGISTERED_PASSENGER: 900,
  OPERATOR_OWNER: 900,
  OPERATOR_MANAGER: 900,
  DRIVER: 1800,
  SUPER_ADMIN: 300,
};

export const REFRESH_TTL_SECONDS: Record<Role, number> = {
  GUEST: 604800,
  REGISTERED_PASSENGER: 604800,
  OPERATOR_OWNER: 604800,
  OPERATOR_MANAGER: 604800,
  DRIVER: 2592000,
  SUPER_ADMIN: 86400,
};

export const OTP_TTL_SECONDS = 600;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_REQUEST_WINDOW_SECONDS = 600;
export const OTP_REQUEST_MAX = 3;
export const RESET_TOKEN_TTL_SECONDS = 1800;
export interface OperatorSignupResult {
  operatorId: string;
  userId: string;
  status: 'APPLIED';
  message: string;
}
```

## A.4b Booking and availability: response types (`apps/api/src/modules/booking/booking.types.ts`)

```ts
// Booking module - enums, DTOs, constants. No runtime imports.

export const BOOKING_STATUS = ['PENDING','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','OPERATOR_CANCELLED','REFUNDED','EXPIRED','FAILED'] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

export const PAYMENT_STATUS = ['INITIATED','PENDING','SUCCEEDED','FAILED','EXPIRED','REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const TICKET_STATUS = ['ISSUED','ACTIVE','SCANNED','USED','CANCELLED'] as const;
export type TicketStatus = (typeof TICKET_STATUS)[number];

export const REFUND_TIER = ['TIER_FULL','TIER_75','TIER_50','TIER_ZERO','TIER_NOT_ELIGIBLE'] as const;
export type RefundTier = (typeof REFUND_TIER)[number];

export const SEAT_STATE = ['AVAILABLE','LOCKED','MINE','BOOKED'] as const;
export type SeatState = (typeof SEAT_STATE)[number];

export const PAYMENT_METHOD = ['UPI','CARD','NETBANKING','WALLET','EMI'] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

// Locked constants per 07 section 4.5 + busverse/03 section 10.3
export const CONVENIENCE_FEE_PAISE = 1500n;   // Rs 15 per booking
export const GST_RATE = 0.05;                 // 5% on fare
export const LOCK_TTL_SECONDS = 300;          // 5 min per shared/03 section 3.2
export const BOOKING_LOCK_TTL_SECONDS = 900;  // 15 min per shared/03 section 5
export const PAYMENT_WINDOW_MINUTES = 15;     // 07 section 4.5
export const MAX_SEATS_PER_BOOKING = 8;       // shared/02 section 3.3
export const MAX_PASSENGER_NAME_LENGTH = 100; // shared/02 section 3.3
export const MAX_SEAT_LABEL_LENGTH = 4;       // 06 v1.3 section 5.7

export interface SeatLockDTO {
  lockId: string;
  scheduleId: string;
  seatId: string;
  seatLabel: string;
  expiresAt: string;
  remainingSeconds: number;
}

export interface AvailabilitySeatDTO {
  id: string;
  /** Stable seat key. Join seats to layout.spec with it. */
  key: string;
  label: string;
  row: string;
  column: number;
  type: 'SEATER' | 'SLEEPER' | 'SEMI_SLEEPER';
  isFemaleOnly: boolean;
  state: SeatState;
  lockedUntil: string | null;
}

export interface AvailabilityDTO {
  schedule: { id: string; fare: { amountPaise: number; currency: string } };
  /** `spec` is the Seat Layout v2 document (parse with parseLayout). rowsCount/columnsCount/aisleCells are the legacy view of the first deck. */
  layout: { rowsCount: number; columnsCount: number; aisleCells: Array<{ row: number; column: number }>; rev: number; spec: Record<string, unknown> };
  seats: AvailabilitySeatDTO[];
}

export interface PassengerDTO {
  seatId: string;
  seatLabel: string;
  name: string;
  age: number | null;
  gender: string | null;
}

export interface BookingSummaryDTO {
  bookingId: string;
  bookingReference: string;
  status: BookingStatus;
  scheduleId: string;
  departureTime: string;
  routeSummary: { originCity: string; destinationCity: string };
  passengerCount: number;
  passengers: PassengerDTO[];
  totalFarePaise: number;
  confirmedAt: string | null;
  createdAt: string;
}

export interface BookingDetailDTO extends BookingSummaryDTO {
  arrivalTime: string;
  boardingStand: { id: string; name: string; type: string };
  droppingStand: { id: string; name: string; type: string };
  fareBreakdown: { baseFarePaise: number; taxPaise: number; convenienceFeePaise: number; totalPaise: number };
  payment: { paymentId: string; status: PaymentStatus; amountPaise: number; currency: string } | null;
  ticket: { ticketId: string; status: TicketStatus; issuedAt: string } | null;
  expiresAt: string | null;
  /** The trip operating this booking's schedule (needed for live tracking), or null before one is assigned. */
  trip: { tripId: string; status: string } | null;
}

export interface TicketDTO {
  ticketId: string;
  bookingId: string;
  qrPayload: string;
  status: TicketStatus;
  issuedAt: string;
}

export interface RefundPreviewDTO {
  bookingId: string;
  tier: RefundTier;
  totalPaidPaise: number;
  fareRefundPaise: number;
  taxRefundPaise: number;
  feeRefundPaise: number;
  totalRefundPaise: number;
  cancellationDeadlineAt: string | null;
  paymentMethod: string | null;
  paymentMethodLast4: string | null;
  expectedRefundDays: { min: number; max: number };
}

export interface PaymentDTO {
  paymentId: string;
  bookingId: string;
  status: PaymentStatus;
  amountPaise: number;
  currency: string;
  checkoutUrl: string | null;
  expiresAt: string;
}

export interface CreateBookingResultDTO {
  bookingId: string;
  bookingReference: string;
  status: BookingStatus;
  expiresAt: string;
  totalFarePaise: number;
}
```

## A.4c Payment response (`apps/api/src/modules/payments/payments.service.ts`)

```ts
export interface PaymentDTO {
  paymentId: string;
  bookingId: string;
  status: PaymentStatus;
  amountPaise: number;
  currency: string;
  checkoutUrl: string | null;
  /** What the app needs to open Razorpay checkout. `mock` means development: confirm via the dev endpoint instead. */
  gateway: { provider: 'RAZORPAY'; keyId: string; orderId: string; mock: boolean } | null;
  expiresAt: string;
}
```

## A.4d Driver trips: response types and scan DTOs (`apps/api/src/modules/trip/trip.types.ts`)

```ts
// Trip module - enums, DTOs, constants. No runtime imports.

export const TRIP_STATUS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type TripStatus = (typeof TRIP_STATUS)[number];

export const DELAY_REASON = [
  'TRAFFIC',
  'WEATHER',
  'BREAKDOWN',
  'ACCIDENT',
  'ROAD_CLOSURE',
  'OTHER',
] as const;
export type DelayReason = (typeof DELAY_REASON)[number];

export const SCAN_RESULT = ['VALID', 'DUPLICATE'] as const;
export type ScanResult = (typeof SCAN_RESULT)[number];

// buscon/02 section 7.3 - trip start allowed within +/-2h of departure
export const TRIP_START_WINDOW_MINUTES = 120;
export const TRIP_START_WINDOW_MS = TRIP_START_WINDOW_MINUTES * 60 * 1000;

// buscon/02 section 12.4 - delay constraints
export const DELAY_MIN_MINUTES = 1;
export const DELAY_MAX_MINUTES = 180;
export const DELAY_MAX_NOTES_LENGTH = 200;

// Scan payload constraints (shared/02 section 3.5)
export const MAX_QR_PAYLOAD_BYTES = 500;
export const MAX_SCAN_WIRE_BYTES = 770;

// Status helpers
export function isTripScannable(status: TripStatus): boolean {
  return status === 'SCHEDULED' || status === 'IN_PROGRESS';
}

export function isTripActive(status: TripStatus): boolean {
  return status === 'IN_PROGRESS';
}

export interface DriverTripSummaryDTO {
  tripId: string;
  scheduleId: string;
  bus: { id: string; registrationNumber: string; model: string | null };
  route: { originCity: string; destinationCity: string };
  departureTime: string;
  arrivalTime: string;
  status: TripStatus;
  boardedCount: number;
  confirmedCount: number;
}

export interface TripDetailDTO extends DriverTripSummaryDTO {
  busId: string;
  driverId: string;
  boardingStands: Array<{ standId: string; standName: string; sequence: number }>;
  startedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  delayReason: DelayReason | null;
  delayMinutes: number | null;
  distanceKm: number | null;
}

export interface StartTripResultDTO {
  tripId: string;
  status: 'IN_PROGRESS';
  startedAt: string;
}

export interface EndTripResultDTO {
  tripId: string;
  status: 'COMPLETED';
  startedAt: string | null;
  endedAt: string;
  durationMinutes: number;
  distanceKm: number;
  boardedCount: number;
  confirmedCount: number;
}

export interface DelayReportRequestDTO {
  reason: DelayReason;
  delayMinutes: number;
  notes?: string | undefined;
}

export interface DelayReportDTO {
  tripId: string;
  delayReason: DelayReason;
  delayMinutes: number;
  reportedAt: string;
}
// ---------- Manifest (buscon/05 section 12.2) ----------

export interface ManifestPassengerDTO {
  bookingId: string;
  bookingReference: string;
  seatLabels: string[];
  passengerNames: string[];
  boardingStatus: 'CONFIRMED' | 'BOARDED' | 'CANCELLED' | 'EXPIRED';
  boardedAt: string | null;
}

export interface ManifestStandGroupDTO {
  standId: string;
  standName: string;
  sequence: number;
  passengers: ManifestPassengerDTO[];
}

export interface ManifestDTO {
  tripId: string;
  scheduleId: string;
  totalPassengers: number;
  totalBoarded: number;
  lastUpdatedAt: string;
  byStand: ManifestStandGroupDTO[];
}

// ---------- Scan (buscon/05 section 5.2) ----------

export interface ScanRequestDTO {
  qrPayload?: string | undefined;
  scannedAt: string;
  scannedLat?: number | undefined;
  scannedLng?: number | undefined;
  manualEntry?: boolean | undefined;
  bookingReference?: string | undefined;
  primaryPassengerName?: string | undefined;
}

export interface ScanResultDTO {
  result: ScanResult;
  ticketId: string;
  bookingId: string;
  primaryPassengerName: string;
  seatLabels: string[];
  passengerCount: number;
  bookingStatus: 'CHECKED_IN';
  scannedAt: string;
  originalScannedAt?: string | undefined;
}

// ---------- Live tracking (buscon/04 section 8B.2) ----------

export interface LiveTripPositionDTO {
  lat: number;
  lng: number;
  recordedAt: string;
}

export interface LiveTripEtaDTO {
  standId: string;
  standName: string;
  etaMinutes: number;
}

export interface LiveTripDTO {
  tripId: string;
  status: TripStatus;
  currentPosition: LiveTripPositionDTO | null;
  speedKmh: number | null;
  lastUpdatedAt: string | null;
  isStale: boolean;
  eta: LiveTripEtaDTO[];
  occupancy: { occupied: number; total: number } | null;
  nextStandId: string | null;
}

export interface MapDTO {
  tripId: string;
  route: {
    originCity: string;
    destinationCity: string;
    stands: Array<{
      standId: string;
      standName: string;
      lat: number;
      lng: number;
      sequence: number;
    }>;
  };
  currentPosition: LiveTripPositionDTO | null;
  lastUpdatedAt: string | null;
}

// ---------- Config + Me (buscon/02 section 4.4, section 13.2) ----------

export interface DriverConfigDTO {
  qrPublicKey: string;
  serverTime: string;
  minAppVersion: string;
  featureFlags: { offlineScan: boolean; gpsTracking: boolean };
}

export interface DriverMeDTO {
  userId: string;
  phone: string;
  name: string | null;
  licenseNumber: string;
  kycStatus: string;
  onDuty: boolean;
  operator: { id: string; companyName: string };
  verifiedAt: string | null;
  createdAt: string;
}
export interface CancelTripResultDTO {
  tripId: string;
  status: 'CANCELLED';
  cancelledBookings: number;
  refundedPaise: number;
}
```

## A.4e Network: response types (`apps/api/src/modules/network/network.types.ts`)

```ts
export const BUS_TYPE = ['SEATER','AC_SEATER','NON_AC_SEATER','SLEEPER','AC_SLEEPER','NON_AC_SLEEPER','SEMI_SLEEPER','AC_SEMI_SLEEPER'] as const;
export type BusType = (typeof BUS_TYPE)[number];
export const SEAT_TYPE = ['SEATER','SEMI_SLEEPER','SLEEPER'] as const;
export type SeatType = (typeof SEAT_TYPE)[number];
export const STAND_TYPE = ['BUS_STAND','PICKUP_POINT','DROP_POINT'] as const;
export type StandType = (typeof STAND_TYPE)[number];
export const BUS_APPROVAL_STATUS = ['PENDING','APPROVED','REJECTED'] as const;
export type BusApprovalStatus = (typeof BUS_APPROVAL_STATUS)[number];
export const ROUTE_APPROVAL_STATUS = ['PENDING','APPROVED','REJECTED'] as const;
export type RouteApprovalStatus = (typeof ROUTE_APPROVAL_STATUS)[number];
export const SCHEDULE_STATUS = ['DRAFT','PUBLISHED','CANCELLED','COMPLETED','EXPIRED'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUS)[number];
export const OPERATOR_STATUS = ['APPLIED','PENDING_REVIEW','APPROVED','REJECTED','SUSPENDED','ACTIVE','DEACTIVATED'] as const;
export type OperatorStatus = (typeof OPERATOR_STATUS)[number];
export const DRIVER_KYC_STATUS = ['INVITED','SIGNED_UP','KYC_PENDING','VERIFIED','KYC_FAILED','ACTIVE','BLOCKED','DEACTIVATED'] as const;
export type DriverKycStatus = (typeof DRIVER_KYC_STATUS)[number];
export const BOOKING_STATUS = ['PENDING','CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED','OPERATOR_CANCELLED','REFUNDED','EXPIRED','FAILED'] as const;
export type BookingStatus = (typeof BOOKING_STATUS)[number];

export interface MoneyDTO { amountPaise: number; currency: string; }
export interface CityDTO { id: string; name: string; state: string; isActive: boolean; }
export interface StandDTO { id: string; cityId: string; name: string; type: StandType; lat: number; lng: number; }
export interface OperatorSummaryDTO { id: string; companyName: string; gstin: string; pan: string; status: OperatorStatus; }
export interface OperatorMeResponse {
  operator: OperatorSummaryDTO;
  user: { id: string; phone: string; email: string | null; name: string | null };
  role: 'OPERATOR_OWNER' | 'OPERATOR_MANAGER';
}
export interface BusDTO {
  id: string; operatorId: string; registrationNumber: string; model: string | null;
  capacity: number; busType: BusType; amenities: string[]; approvalStatus: BusApprovalStatus;
  insuranceDocRef: string | null; insuranceExpiresAt: string | null; createdAt: string;
}
export interface SeatDTO { id: string; key: string; seatRow: string; seatColumn: number; seatLabel: string; seatType: SeatType; isFemaleOnly: boolean; }
export interface SeatLayoutDTO { id: string; busId: string; rowsCount: number; columnsCount: number; aisleCells: Array<{ row: string; column: number }>; seats: SeatDTO[]; rev: number; spec: Record<string, unknown>; }
export interface RouteStandDTO { stand: StandDTO; sequence: number; distanceFromPrevKm: number; durationFromPrevMin: number; }
export interface RouteDTO { id: string; operatorId: string; originCity: CityDTO; destinationCity: CityDTO; approvalStatus: RouteApprovalStatus; stands: RouteStandDTO[]; createdAt: string; }

export interface ScheduleOperatorDTO {
  id: string; operatorId: string; busId: string; routeId: string;
  departureTime: string; arrivalTime: string; fare: MoneyDTO; status: ScheduleStatus;
  bus: { id: string; registrationNumber: string; model: string | null; capacity: number; busType: BusType; approvalStatus: BusApprovalStatus; };
  route: { id: string; originCity: CityDTO; destinationCity: CityDTO; approvalStatus: RouteApprovalStatus; };
  createdAt: string;
}
export interface ScheduleSearchResultDTO {
  scheduleId: string; busType: BusType; operatorName: string;
  departureTime: string; arrivalTime: string; durationMinutes: number;
  fare: MoneyDTO; availableSeats: number;
}
export interface ScheduleDetailDTO extends ScheduleSearchResultDTO {
  status: ScheduleStatus;
  bus: { id: string; registrationNumber: string; model: string | null; capacity: number; busType: BusType; amenities: string[]; };
  route: { id: string; originCity: CityDTO; destinationCity: CityDTO; stands: Array<{ stand: StandDTO; sequence: number; distanceFromPrevKm: number; durationFromPrevMin: number }>; };
}

// ---------- Phase 3c DTOs ----------
export interface DriverDTO {
  id: string;
  userId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  kycStatus: DriverKycStatus;
  onDuty: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface PassengerSummaryDTO {
  name: string;
  seatLabel: string;
  age: number | null;
  gender: string | null;
}

export interface BookingSummaryDTO {
  bookingId: string;
  bookingReference: string;
  status: BookingStatus;
  scheduleId: string;
  departureTime: string;
  routeSummary: { originCity: string; destinationCity: string };
  passengerCount: number;
  passengers: PassengerSummaryDTO[];
  totalFarePaise: number;
  confirmedAt: string | null;
  createdAt: string;
}

export interface BookingDetailDTO extends BookingSummaryDTO {
  schedule: {
    busId: string;
    departureTime: string;
    arrivalTime: string;
    routeSummary: { originCity: string; destinationCity: string };
  };
  boardingStand: { id: string; name: string; type: StandType };
  droppingStand: { id: string; name: string; type: StandType };
  fareBreakdown: { baseFarePaise: number; taxPaise: number; convenienceFeePaise: number };
  payment: { status: string; amountPaise: number; currency: string } | null;
  boardingScans: Array<{ seatLabel: string; scannedAt: string; result: string }>;
}

export interface DashboardDTO {
  asOf: string;
  today: { date: string; timezone: string; bookingsCount: number; passengerCount: number; revenuePaise: number; cancelledCount: number; refundedPaise: number; };
  activeTrips: number;
  upcomingTripsToday: number;
  pendingApprovals: { buses: number; routes: number; schedules: number; };
  drivers: { total: number; onDuty: number; kycPending: number; };
}

export interface RevenueBucketDTO { date: string; revenuePaise: number; refundsPaise: number; bookingCount: number; }
export interface RevenueDTO {
  from: string; to: string; groupBy: 'day' | 'week' | 'month';
  totalRevenuePaise: number; totalRefundsPaise: number; netRevenuePaise: number;
  buckets: RevenueBucketDTO[];
}
export interface RevenueDailyDTO {
  days: Array<{ date: string; revenuePaise: number; bookingCount: number }>;
  timezone: string;
}
export interface SettlementDTO {
  id: string; cycleStart: string; cycleEnd: string;
  grossPaise: number; refundsPaise: number; netPaise: number;
  status: string; settledAt: string | null;
}
export interface ManagerDTO {
  operatorUserId: string; userId: string; name: string | null;
  email: string | null; phone: string; role: 'OWNER' | 'MANAGER';
  invitedAt: string; acceptedAt: string | null;
}
// ---------- Phase 13: Operator trip assignment ----------
export interface OperatorTripDTO {
  tripId: string;
  scheduleId: string;
  busId: string;
  driverId: string;
  driverName: string | null;
  driverPhone: string;
  busRegistrationNumber: string;
  routeSummary: { originCity: string; destinationCity: string };
  departureTime: string;
  arrivalTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt: string | null;
  endedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}
```

## A.5 Realtime events (`apps/api/src/realtime/events.ts`)

```ts
// 16 canonical event payload builders - one per shared/04 section 4.2.
// Every builder returns { event, data } with _v: 1.

export interface EventEnvelope<T = Record<string, unknown>> {
  event: string;
  data: T & { _v: 1 };
}

export type TripDelayReason = 'TRAFFIC' | 'WEATHER' | 'BREAKDOWN' | 'ACCIDENT' | 'ROAD_CLOSURE' | 'OTHER';
export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'EMI';
export type BookingCancelReason = 'PASSENGER_CANCELLED' | 'OPERATOR_CANCELLED' | 'TRIP_CANCELLED';
export type SeatReleaseReason = 'manual' | 'expired' | 'payment_failed' | 'payment_timeout';
export type GpsFailureType = 'TELEPORT_DETECTED' | 'SPEED_MISMATCH' | 'COORDINATE_INVALID';

// 1. seat:locked
export function seatLocked(p: { seatId: string; lockedUntil: string; lockedByMe: boolean }): EventEnvelope {
  return { event: 'seat:locked', data: { _v: 1, ...p } };
}

// 2. seat:released
export function seatReleased(p: { seatId: string; reason: SeatReleaseReason }): EventEnvelope {
  return { event: 'seat:released', data: { _v: 1, ...p } };
}

// 3. seat:booked
export function seatBooked(p: { seatId: string; bookingId: string }): EventEnvelope {
  return { event: 'seat:booked', data: { _v: 1, ...p } };
}

// 4. bus:position
export function busPosition(p: {
  tripId: string; scheduleId: string;
  lat: number; lng: number; speedKmh: number;
  bearing: number | null; accuracyM: number;
  recordedAt: string; receivedAt: string;
  nextStandId: string | null; etaMinutes: number | null;
}): EventEnvelope {
  return { event: 'bus:position', data: { _v: 1, ...p } };
}

// 5. trip:started
export function tripStarted(p: { tripId: string; startedAt: string }): EventEnvelope {
  return { event: 'trip:started', data: { _v: 1, ...p } };
}

// 6. trip:delayed
export function tripDelayed(p: { tripId: string; reason: TripDelayReason; minutes: number }): EventEnvelope {
  return { event: 'trip:delayed', data: { _v: 1, ...p } };
}

// 7. trip:ended
export function tripEnded(p: { tripId: string; endedAt: string; distanceKm: number }): EventEnvelope {
  return { event: 'trip:ended', data: { _v: 1, ...p } };
}

// 8. trip:cancelled
export function tripCancelled(p: { tripId: string; reason: string }): EventEnvelope {
  return { event: 'trip:cancelled', data: { _v: 1, ...p } };
}

// 9. booking:confirmed
export function bookingConfirmed(p: { bookingId: string; ticketId: string; totalFarePaise: number }): EventEnvelope {
  return { event: 'booking:confirmed', data: { _v: 1, ...p } };
}

// 10. booking:cancelled
export function bookingCancelled(p: { bookingId: string; reason: BookingCancelReason; refundId: string | null }): EventEnvelope {
  return { event: 'booking:cancelled', data: { _v: 1, ...p } };
}

// 11. booking:expired
export function bookingExpired(p: { bookingId: string }): EventEnvelope {
  return { event: 'booking:expired', data: { _v: 1, ...p } };
}

// 12. boarding:verified
export function boardingVerified(p: {
  bookingId: string; ticketId: string;
  passengerCount: number; allSeatLabels: string[]; boardedAt: string;
}): EventEnvelope {
  return { event: 'boarding:verified', data: { _v: 1, ...p } };
}

// 13. payment:succeeded
export function paymentSucceeded(p: { paymentId: string; bookingId: string; method: PaymentMethod | null }): EventEnvelope {
  return { event: 'payment:succeeded', data: { _v: 1, ...p } };
}

// 14. operator:applied
export function operatorApplied(p: { operatorId: string; companyName: string; submittedAt: string }): EventEnvelope {
  return { event: 'operator:applied', data: { _v: 1, ...p } };
}

// 15. refund:requested
export function refundRequested(p: { refundId: string; bookingId: string; amountPaise: number; reason: string }): EventEnvelope {
  return { event: 'refund:requested', data: { _v: 1, ...p } };
}

// 16. gps_anomaly
export function gpsAnomaly(p: {
  tripId: string; driverId: string;
  failureCount: number; lastFailureType: GpsFailureType; detectedAt: string;
}): EventEnvelope {
  return { event: 'gps_anomaly', data: { _v: 1, ...p } };
}

export const EVENT_NAMES = [
  'seat:locked', 'seat:released', 'seat:booked',
  'bus:position', 'trip:started', 'trip:delayed', 'trip:ended', 'trip:cancelled',
  'booking:confirmed', 'booking:cancelled', 'booking:expired', 'boarding:verified', 'payment:succeeded',
  'operator:applied', 'refund:requested', 'gps_anomaly',
] as const;
```

## A.6 Realtime topic access rules (`apps/api/src/realtime/topics.ts`)

```ts
import type { Socket } from 'socket.io';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import type { WsClaims } from './auth.js';

export interface SubscribeResult {
  allowed: boolean;
  reason?: string;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const SEAT_AVAILABILITY_RE = new RegExp(`^seat:availability:(${UUID})$`);
const TRIP_LIVE_RE = new RegExp(`^trip:live:(${UUID})$`);
const BOOKING_RE = new RegExp(`^booking:(${UUID})$`);
const ADMIN_NOTIFICATIONS = 'admin:notifications';

async function canSeatAvailability(scheduleId: string): Promise<boolean> {
  const row = await prisma.schedule.findFirst({
    where: { id: scheduleId, status: 'PUBLISHED', deletedAt: null },
    select: { id: true },
  });
  return !!row;
}

async function canTripLive(tripId: string, claims: WsClaims): Promise<boolean> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { scheduleId: true },
  });
  if (!trip) return false;
  if (claims.role === 'SUPER_ADMIN') return true;
  const booking = await prisma.booking.findFirst({
    where: {
      userId: claims.userId,
      scheduleId: trip.scheduleId,
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      deletedAt: null,
    },
    select: { id: true },
  });
  return !!booking;
}

async function canBooking(bookingId: string, claims: WsClaims): Promise<boolean> {
  if (claims.role === 'SUPER_ADMIN') return true;
  const b = await prisma.booking.findFirst({
    where: { id: bookingId, userId: claims.userId, deletedAt: null },
    select: { id: true },
  });
  return !!b;
}

export async function subscribeToTopic(
  socket: Socket,
  topic: string,
  claims: WsClaims,
): Promise<SubscribeResult> {
  if (topic === ADMIN_NOTIFICATIONS) {
    if (claims.role !== 'SUPER_ADMIN') return { allowed: false, reason: 'FORBIDDEN' };
    socket.join(topic);
    return { allowed: true };
  }

  let m = topic.match(SEAT_AVAILABILITY_RE);
  if (m) {
    if (!(await canSeatAvailability(m[1]!))) return { allowed: false, reason: 'SCHEDULE_NOT_FOUND' };
    socket.join(topic);
    return { allowed: true };
  }

  m = topic.match(TRIP_LIVE_RE);
  if (m) {
    if (!(await canTripLive(m[1]!, claims))) return { allowed: false, reason: 'FORBIDDEN' };
    socket.join(topic);
    return { allowed: true };
  }

  m = topic.match(BOOKING_RE);
  if (m) {
    if (!(await canBooking(m[1]!, claims))) return { allowed: false, reason: 'FORBIDDEN' };
    socket.join(topic);
    return { allowed: true };
  }

  logger.warn({ topic, userId: claims.userId }, 'unknown topic pattern');
  return { allowed: false, reason: 'UNKNOWN_TOPIC' };
}
```

## A.7a Seat engine: document types (`packages/seat-engine/src/types.ts`)

```ts
// Seat Layout v2 - canonical types. Pure data, no runtime dependencies.

export const LAYOUT_VERSION = 2 as const;

export const LIMITS = {
  maxDecks: 2,
  maxRows: 40,
  maxCols: 10,
  maxUnits: 150,
  maxSpan: 4,
  maxCapacity: 4,
  maxLabelLength: 8,
  maxKeyLength: 16,
  maxFeatures: 8,
} as const;

export const DECK_IDS = ['MAIN', 'LOWER', 'UPPER'] as const;
export type DeckId = (typeof DECK_IDS)[number];
export const DECK_ORDER: Record<DeckId, number> = { MAIN: 0, LOWER: 0, UPPER: 1 };
export const DECK_TITLES: Record<DeckId, string> = {
  MAIN: 'Main deck',
  LOWER: 'Lower deck',
  UPPER: 'Upper deck',
};

export const SEAT_TYPES = ['SEATER', 'SEMI_SLEEPER', 'SLEEPER'] as const;
export type SeatType = (typeof SEAT_TYPES)[number];

/** Taxonomy of a bookable unit. Phase 1 sells SEAT and BERTH only. */
export const UNIT_KINDS = ['SEAT', 'BERTH', 'CABIN'] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];

/** WHOLE = sold as one unit. EITHER (half-berth sale) is modelled but disabled in Phase 1. */
export const SALE_MODES = ['WHOLE', 'EITHER'] as const;
export type SaleMode = (typeof SALE_MODES)[number];

export const FIXTURE_KINDS = ['DOOR', 'DRIVER', 'CREW', 'STAIRS', 'WC', 'LUGGAGE', 'VOID'] as const;
export type FixtureKind = (typeof FIXTURE_KINDS)[number];
/** Fixtures a passenger can walk through. Everything else blocks movement. */
export const WALKABLE_FIXTURES: ReadonlySet<FixtureKind> = new Set<FixtureKind>(['DOOR', 'STAIRS']);

export const SEAT_FEATURES = [
  'EXTRA_LEGROOM',
  'EMERGENCY_EXIT_ROW',
  'ACCESSIBLE',
  'CHARGING',
  'FOLD_UP',
  'NEAR_DOOR',
  'NEAR_WC',
] as const;
export type SeatFeature = (typeof SEAT_FEATURES)[number];

export const DEFAULT_FARE_TIER = 'STANDARD';

export interface Deck {
  id: DeckId;
  rows: number;
  cols: number;
}

/** A bookable unit: seat, berth or cabin. Coordinates are 0-based, row 0 is the front of the bus. */
export interface Seat {
  key: string;
  label: string;
  deck: DeckId;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  type: SeatType;
  unit: UnitKind;
  capacity: number;
  sale: SaleMode;
  femaleOnly: boolean;
  fareTier: string;
  features: SeatFeature[];
}

/** Non-bookable object on the floor plan (door, driver cab, stairs, toilet, ...). */
export interface Fixture {
  fixture: FixtureKind;
  deck: DeckId;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  label: string;
}

export interface LayoutMeta {
  name: string;
  preset: string;
}

/** The canonical layout document (always fully normalised). */
export interface Layout {
  v: 2;
  decks: Deck[];
  seats: Seat[];
  fixtures: Fixture[];
  meta: LayoutMeta;
}

export type IssueSeverity = 'error' | 'warning';
export type IssueCode =
  | 'SCHEMA'
  | 'BAD_DECKS'
  | 'GRID_TOO_LARGE'
  | 'OUT_OF_BOUNDS'
  | 'OVERLAP'
  | 'DUPLICATE_KEY'
  | 'DUPLICATE_LABEL'
  | 'BAD_KEY'
  | 'BAD_LABEL'
  | 'BAD_SPAN'
  | 'BAD_CAPACITY'
  | 'TYPE_UNIT_MISMATCH'
  | 'NO_SEATS'
  | 'TOO_MANY_SEATS'
  | 'CAPACITY_MISMATCH'
  | 'UNREACHABLE_SEAT'
  | 'NO_ACCESS_POINT'
  | 'FEATURE_DISABLED'
  | 'DECK_EMPTY';

export interface LayoutIssue {
  code: IssueCode;
  severity: IssueSeverity;
  message: string;
  keys?: string[];
  deck?: DeckId;
  row?: number;
  col?: number;
}

export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED' | 'MINE' | 'BLOCKED';
export interface SeatRuntime {
  status: SeatStatus;
  lockedUntil?: string | null;
}
/** Runtime state keyed by seat `key` (not by database id). */
export type RuntimeMap = Readonly<Record<string, SeatRuntime>>;

export function defaultUnitFor(type: SeatType): UnitKind {
  return type === 'SLEEPER' ? 'BERTH' : 'SEAT';
}
```

## A.7b Seat engine: functions (`packages/seat-engine/src/*.ts`)

| File | Function | Parameters | Returns | Purpose |
|------|----------|------------|---------|---------|
| diff.ts | `diffLayouts` | `prev: Layout | null, next: Layout` | `LayoutDiff` | Changing any of these changes what a booking means |
| diff.ts | `affectedKeys` | `diff: LayoutDiff` | `string[]` | Seats whose bookings/locks would be disturbed by this change. |
| editor.ts | `whatIsAt` | `layout: Layout, deck: DeckId, row: number, col: number` | `` | Headless editor state for the BusCon seat-layout studio |
| geometry.ts | `adjacency` | `layout: Layout` | `Map<string, Neighbor[]>` | Next to the bus wall (grid edge or a blocking fixture) on at least one side |
| grid.ts | `forEachCell` | `r: Rect, fn: (row: number, col: number` | `` |  |
| grid.ts | `deckById` | `layout: Layout, id: DeckId` | `Deck | undefined` |  |
| grid.ts | `inBounds` | `deck: Deck, row: number, col: number` | `boolean` |  |
| grid.ts | `buildOccupancy` | `layout: Layout` | `Occupancy` |  |
| grid.ts | `isFloor` | `occ: Occupancy, deck: Deck, row: number, col: number` | `boolean` | Walkable floor = inside the grid, no seat, and either empty or a door/stairs. |
| labels.ts | `rowLetters` | `index: number` | `string` | 0 -> A, 25 -> Z, 26 -> AA ... |
| labels.ts | `letterIndex` | `letters: string` | `number` | Inverse of rowLetters |
| labels.ts | `compareSeats` | `a: Seat, b: Seat` | `number` |  |
| labels.ts | `compareFixtures` | `a: Fixture, b: Fixture` | `number` |  |
| labels.ts | `relabel` | `layout: Layout, scheme: LabelScheme` | `Layout` | Re-label every seat |
| labels.ts | `nextKey` | `layout: Layout, prefix = 'S'` | `string` | Smallest unused key of the form S1, S2, ... |
| labels.ts | `keysFromLabels` | `layout: Layout` | `Layout` | Make keys human readable: key := label (sanitised) |
| legacy.ts | `fromLegacy` | `input: LegacyLayoutInput` | `Layout` | Shape stored by the v1 engine: rows A.., columns 1.., single deck, one cell per seat |
| legacy.ts | `toLegacy` | `layout: Layout` | `LegacyLayoutOut` | Legacy columns for old clients |
| legacy.ts | `legacyAisleCells` | `layout: Layout` | `Array<` | Every walkable, seat-free cell of the first deck, 1-based |
| legacy.ts | `legacyAisleCellsLetters` | `layout: Layout` | `Array<` | Same cells with the letter row used by the operator DTO. |
| parse.ts | `parseLayout` | `input: unknown` | `ParseResult` | Structural parse: accepts loose input (optional fields, missing defaults), returns a fully normalised Layout |
| parse.ts | `normalizeLayout` | `layout: Layout` | `Layout` | Canonical ordering (decks, seats, fixtures) |
| parse.ts | `compactLayout` | `layout: Layout` | `Record<string, unknown>` | Strip defaults for storage / transport |
| parse.ts | `layoutFingerprint` | `layout: Layout` | `string` | Deterministic JSON for equality checks and change detection. |
| presets.ts | `buildSeaterLayout` | `o: SeaterOptions, name = '', preset = ''` | `Layout` | Seats left of the aisle (1-4) |
| presets.ts | `buildSleeperLayout` | `o: SleeperOptions, name = '', preset = ''` | `Layout` | 1 or 2 single berths, or one DOUBLE berth (2 columns wide, holds 2) |
| presets.ts | `buildDoubleDeckerLayout` | `o: DoubleDeckerOptions, name = '', preset = ''` | `Layout` | Two-floor seater with a staircase. |
| render.ts | `buildRenderPlan` | `layout: Layout, options: Partial<RenderOptions> = {}` | `RenderPlan` | Width of a column that holds no seat (the aisle) |
| render.ts | `fitToWidth` | `layout: Layout, maxWidth: number, base: Partial<RenderOptions> = {}, minScale = 0.8` | `FitResult` | True when even the minimum scale does not fit: wrap the map in a horizontal scroller |
| render.ts | `cellAt` | `deck: DeckPlan, x: number, y: number` | `` | Pointer position -> grid cell |
| state.ts | `selectionGroups` | `layout: Layout, selected: readonly string[]` | `string[][]` | Server limit for one booking (createBookingSchema: passengers max 8) |
| state.ts | `validateSelection` | `layout: Layout, selected: readonly string[], opts: { maxSeats?: number } = {}` | `SelectionIssue[]` |  |
| state.ts | `suggestTogether` | `layout: Layout, runtime: RuntimeMap, count: number, opts: SuggestOptions = {}` | `string[] | null` | "Seat us together": greedy best group of `count` AVAILABLE seats that are adjacent (side by side > across the aisle/stacked > front/back) |
| types.ts | `defaultUnitFor` | `type: SeatType` | `UnitKind` |  |
| validate.ts | `checkLayout` | `input: unknown, opts: ValidateOptions = {}` | `CheckResult` | bus.capacity - must equal the number of bookable units |
| validate.ts | `layoutStats` | `layout: Layout` | `LayoutStats` |  |
