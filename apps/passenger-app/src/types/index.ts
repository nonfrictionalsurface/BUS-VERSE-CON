// API types inferred from backend contracts (07-API-AND-REALTIME-CONTRACTS + apps/api modules).
// Every shape here matches a response from an actual API route — no assumptions.

// ── Envelope (07 §2) ──
export interface ApiEnvelope<T> {
  data: T;
  meta?: { requestId?: string; nextCursor?: string | null };
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

// ── Identity (identity.types.ts) ──
export type Role = 'GUEST' | 'REGISTERED_PASSENGER' | 'OPERATOR_OWNER' | 'OPERATOR_MANAGER' | 'DRIVER' | 'SUPER_ADMIN';

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

export interface LoginResult extends AuthTokens {
  user: UserDTO;
}

export interface OtpRequestResult {
  expiresInSeconds: number;
}

export interface PassengerMeDTO {
  userId: string;
  phone: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  passengerProfile: { name: string; dob: string | null; gender: string | null } | null;
  createdAt: string;
}

// ── Network enums (network.types.ts) ──
export type BusType = 'SEATER' | 'AC_SEATER' | 'SLEEPER' | 'AC_SLEEPER' | 'SEMI_SLEEPER';
export type SeatType = 'SEATER' | 'SLEEPER';
export type StandType = 'BUS_STAND' | 'PICKUP_POINT' | 'DROP_POINT';
export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';

// ── Money ──
export interface MoneyDTO {
  amountPaise: number;
  currency: string;
}

// ── Cities + Stands ──
export interface CityDTO {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
}

export interface StandDTO {
  id: string;
  cityId: string;
  name: string;
  type: StandType;
  lat: number;
  lng: number;
}

// ── Search + Schedule detail (network.types.ts) ──
export interface ScheduleSearchResultDTO {
  scheduleId: string;
  busType: BusType;
  operatorName: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  fare: MoneyDTO;
  availableSeats: number;
}

export interface ScheduleStandDTO {
  stand: StandDTO;
  sequence: number;
  distanceFromPrevKm: number;
  durationFromPrevMin: number;
}

export interface ScheduleDetailDTO extends ScheduleSearchResultDTO {
  status: ScheduleStatus;
  bus: {
    id: string;
    registrationNumber: string;
    model: string | null;
    capacity: number;
    busType: BusType;
    amenities: string[];
  };
  route: {
    id: string;
    originCity: CityDTO;
    destinationCity: CityDTO;
    stands: ScheduleStandDTO[];
  };
}

// ── Availability + Seat lock (booking.types.ts) ──
export type SeatState = 'AVAILABLE' | 'LOCKED' | 'MINE' | 'BOOKED';

export interface AvailabilitySeatDTO {
  id: string;
  label: string;
  row: string;
  column: number;
  type: 'SEATER' | 'SLEEPER' | 'SEMI_SLEEPER';
  isFemaleOnly: boolean;
  state: SeatState;
  lockedUntil: string | null;
}

export interface AvailabilityDTO {
  schedule: { id: string; fare: MoneyDTO };
  layout: { rowsCount: number; columnsCount: number; aisleCells: Array<{ row: number; column: number }> };
  seats: AvailabilitySeatDTO[];
}

export interface SeatLockDTO {
  lockId: string;
  scheduleId: string;
  seatId: string;
  seatLabel: string;
  expiresAt: string;
  remainingSeconds: number;
}

// ── Booking (booking.types.ts) ──
export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OPERATOR_CANCELLED'
  | 'REFUNDED'
  | 'EXPIRED'
  | 'FAILED';

export interface PassengerDTO {
  seatId: string;
  seatLabel: string;
  name: string;
  age: number | null;
  gender: string | null;
}

export interface CreateBookingResultDTO {
  bookingId: string;
  bookingReference: string;
  status: BookingStatus;
  expiresAt: string;
  totalFarePaise: number;
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

export type PaymentStatus = 'INITIATED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
export type TicketStatus = 'ISSUED' | 'ACTIVE' | 'SCANNED' | 'USED' | 'CANCELLED';

export interface BookingDetailDTO extends BookingSummaryDTO {
  arrivalTime: string;
  boardingStand: { id: string; name: string; type: StandType };
  droppingStand: { id: string; name: string; type: StandType };
  fareBreakdown: { baseFarePaise: number; taxPaise: number; convenienceFeePaise: number; totalPaise: number };
  payment: { paymentId: string; status: PaymentStatus; amountPaise: number; currency: string } | null;
  ticket: { ticketId: string; status: TicketStatus; issuedAt: string } | null;
  expiresAt: string | null;
}

// ── Refund (booking.types.ts) ──
export type RefundTier = 'TIER_FULL' | 'TIER_75' | 'TIER_50' | 'TIER_ZERO' | 'TIER_NOT_ELIGIBLE';

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

export interface CancelBookingResultDTO {
  bookingId: string;
  status: 'CANCELLED';
  refund: { refundId: string; tier: RefundTier; amountPaise: number; status: string };
}

// ── Payment (payments.service.ts) ──
export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'EMI';

export interface PaymentDTO {
  paymentId: string;
  bookingId: string;
  status: PaymentStatus;
  amountPaise: number;
  currency: string;
  checkoutUrl: string | null;
  expiresAt: string;
}

// ── Ticket (booking.service.ts getTicket) ──
export interface TicketDTO {
  ticketId: string;
  bookingId: string;
  qrPayload: string;
  status: TicketStatus;
  issuedAt: string;
}

// ── Live tracking (trip.types.ts) ──
export type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

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
    stands: Array<{ standId: string; standName: string; lat: number; lng: number; sequence: number }>;
  };
  currentPosition: LiveTripPositionDTO | null;
  lastUpdatedAt: string | null;
}

// ── WebSocket events (realtime/events.ts) ──
export interface WsEnvelope<T = Record<string, unknown>> {
  event: string;
  data: T & { _v: 1 };
  ts: string;
}

export interface SeatLockedEvent {
  seatId: string;
  lockedUntil: string;
  lockedByMe: boolean;
}

export interface SeatReleasedEvent {
  seatId: string;
  reason: 'manual' | 'expired' | 'payment_failed' | 'payment_timeout';
}

export interface SeatBookedEvent {
  seatId: string;
  bookingId: string;
}

export interface BookingConfirmedEvent {
  bookingId: string;
  ticketId: string;
  totalFarePaise: number;
}

export interface BookingCancelledEvent {
  bookingId: string;
  reason: 'PASSENGER_CANCELLED' | 'OPERATOR_CANCELLED' | 'TRIP_CANCELLED';
  refundId: string | null;
}

export interface BookingExpiredEvent {
  bookingId: string;
}

export interface BoardingVerifiedEvent {
  bookingId: string;
  ticketId: string;
  passengerCount: number;
  allSeatLabels: string[];
  boardedAt: string;
}

export interface BusPositionEvent {
  tripId: string;
  scheduleId: string;
  lat: number;
  lng: number;
  speedKmh: number;
  bearing: number | null;
  accuracyM: number;
  recordedAt: string;
  receivedAt: string;
  nextStandId: string | null;
  etaMinutes: number | null;
}

export interface TripStartedEvent {
  tripId: string;
  startedAt: string;
}

export interface TripEndedEvent {
  tripId: string;
  endedAt: string;
  distanceKm: number;
}

export interface TripCancelledEvent {
  tripId: string;
  reason: string;
}

// ── Navigation param list (per 05-UI-SPEC §21) ──
export type RootStackParamList = {
  Home: undefined;
  Search: { from?: string; to?: string; date?: string } | undefined;
  Results: {
    originCityId: string;
    destinationCityId: string;
    originCityName: string;
    destinationCityName: string;
    date: string;
    sortBy?: 'departureTime' | 'fare';
  };
  SeatSelection: { scheduleId: string; farePaise: number };
  PassengerManifest: { scheduleId: string; lockId: string; seatLabel: string; farePaise: number };
  Payment: { bookingId: string; amountPaise: number; reference: string; expiresAt: string };
  MyTickets: undefined;
  Ticket: { bookingId: string };
  LiveTracking: { tripId: string; bookingId?: string };
  Cancel: { bookingId: string };
  Profile: undefined;
};
