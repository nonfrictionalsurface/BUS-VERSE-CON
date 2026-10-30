// Booking module — enums, DTOs, constants. No runtime imports.

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

// Locked constants per 07 §4.5 + busverse/03 §10.3
export const CONVENIENCE_FEE_PAISE = 1500n;   // ₹15 per booking
export const GST_RATE = 0.05;                 // 5% on fare
export const LOCK_TTL_SECONDS = 300;          // 5 min per shared/03 §3.2
export const BOOKING_LOCK_TTL_SECONDS = 900;  // 15 min per shared/03 §5
export const PAYMENT_WINDOW_MINUTES = 15;     // 07 §4.5
export const MAX_SEATS_PER_BOOKING = 8;       // shared/02 §3.3
export const MAX_PASSENGER_NAME_LENGTH = 100; // shared/02 §3.3
export const MAX_SEAT_LABEL_LENGTH = 4;       // 06 v1.3 §5.7

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
  layout: { rowsCount: number; columnsCount: number; aisleCells: Array<{ row: number; column: number }> };
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