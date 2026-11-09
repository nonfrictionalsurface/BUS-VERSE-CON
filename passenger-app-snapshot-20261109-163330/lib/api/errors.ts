// 52 error codes from 07-API-AND-REALTIME-CONTRACTS §9.2, mapped to user-facing copy from 05-UI-SPEC §19.3.

export const ERROR_MESSAGES: Record<string, string> = {
  // Auth
  INVALID_OTP: 'Incorrect code. Try again.',
  OTP_EXPIRED: 'Code expired. Request a new one.',
  OTP_ATTEMPTS_EXCEEDED: 'Too many attempts. Try again in 15 min.',
  EMAIL_ALREADY_REGISTERED: 'This email is already registered.',
  PHONE_ALREADY_REGISTERED: 'This phone is already registered.',
  INVALID_EMAIL_FORMAT: 'Enter a valid email address.',
  INVALID_PHONE_FORMAT: 'Enter a valid phone number.',

  // Generic
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: "You don't have access to that.",
  NOT_FOUND: "We couldn't find that.",
  VALIDATION_ERROR: 'Some fields need your attention.',
  INVALID_REQUEST: "That request didn't look right.",
  INTERNAL_ERROR: 'Something went wrong. Try again.',
  RATE_LIMITED: 'Too many requests. Wait a moment.',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable.',
  GATEWAY_TIMEOUT: 'Payment gateway timed out.',

  // Booking / seats
  SEAT_LOCKED: 'This seat was just taken. Pick another.',
  SEAT_ALREADY_BOOKED: 'This seat is already booked.',
  LOCK_EXPIRED: 'Your seat lock expired. Pick again.',
  LOCK_NOT_FOUND: 'Seat lock not found. Pick again.',
  INVALID_SEAT: 'That seat is not valid for this trip.',
  INVALID_SCHEDULE: 'This trip is no longer available.',
  SCHEDULE_DEPARTED: 'This trip has already departed.',
  BOOKING_IMMUTABLE: "Booking can't be modified after confirmation.",
  INVALID_TRANSITION: "Can't do that right now.",
  PAYMENT_NOT_ALLOWED: 'Payment window closed. Book again.',
  PAYMENT_ALREADY_SUCCEEDED: 'Already paid. Redirecting…',

  // Idempotency
  IDEMPOTENCY_KEY_REUSED: 'Please refresh and try again.',

  // Refunds
  REFUND_EXCEEDS_PAYMENT: 'Refund amount exceeds payment.',
  PAYMENT_NOT_REFUNDABLE: 'This payment is not refundable.',
};

export function userMessageFor(code: string, fallback = 'Something went wrong.'): string {
  return ERROR_MESSAGES[code] ?? fallback;
}