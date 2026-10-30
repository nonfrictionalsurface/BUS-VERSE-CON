import { errors } from '../../lib/errors.js';

export const bookingErrors = {
  notFound: () => errors.notFound('Booking not found'),
  bookingNotPending: () => errors.invalidTransition('Booking is not PENDING'),
  bookingNotConfirmed: () => errors.invalidTransition('Booking is not CONFIRMED'),
  bookingImmutable: () => errors.bookingImmutable(),
  invalidPassengerCount: (n: number, max: number) =>
    errors.invalidRequest(`Passenger count ${n} must be 1..${max}`, { count: n, max }),
  duplicateSeats: (seatId: string) =>
    errors.invalidRequest(`Duplicate seat ${seatId} in request`, { seatId }),
  passengerSeatMismatch: () =>
    errors.invalidRequest('Passenger seatIds do not match the seats you hold locks on'),
  scheduleDeparted: () => errors.scheduleDeparted(),
  invalidStand: () => errors.invalidRequest('Stand is invalid for this schedule'),
  invalidSeat: () => errors.invalidSeat(),
  invalidSchedule: () => errors.invalidSchedule(),
  lockExpired: (seatId?: string) => errors.lockExpired(seatId),
  lockNotFound: () => errors.lockNotFound(),
  seatAlreadyBooked: (seatId: string) => errors.seatAlreadyBooked(seatId),
  seatLocked: (seatId: string) => errors.seatLocked(seatId),
  ticketNotIssued: () => errors.notFound('Ticket not issued yet — confirm payment first'),
  paymentNotFound: () => errors.notFound('Payment not found'),
  idempotencyKeyReused: () => errors.idempotencyKeyReused(),
  paymentAlreadySucceeded: () => errors.paymentAlreadySucceeded(),
};