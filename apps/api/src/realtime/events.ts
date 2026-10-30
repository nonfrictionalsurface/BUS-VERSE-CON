// 16 canonical event payload builders — one per shared/04 §4.2.
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