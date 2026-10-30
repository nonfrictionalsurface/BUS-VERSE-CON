/**
 * Canonical 52 Error Codes & User-Facing Explanations
 * Contract Reference: 07-API-AND-REALTIME-CONTRACTS.md Section 9.2
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  INVALID_OTP: 'The OTP entered is incorrect. Please check and re-enter.',
  OTP_EXPIRED: 'This OTP has expired. Please request a fresh code.',
  OTP_CHALLENGE_EXPIRED: 'Session expired. Please request a new OTP.',
  TOO_MANY_ATTEMPTS: 'Too many incorrect attempts. Please wait 10 minutes.',
  PHONE_ALREADY_REGISTERED: 'This mobile number is already registered. Please log in.',
  EMAIL_ALREADY_REGISTERED: 'This email address is already associated with an account.',
  INVALID_PHONE_FORMAT: 'Please enter a valid 10-digit mobile number with country code (+91).',
  INVALID_EMAIL_FORMAT: 'Please provide a valid email format.',
  INVALID_CREDENTIALS: 'The login credentials entered do not match our records.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address to proceed.',
  SESSION_REVOKED: 'Your session has been terminated. Please log in again.',
  TOKEN_EXPIRED: 'Session expired. Automatically refreshing your credentials...',
  TOKEN_INVALID: 'Invalid authentication token. Please log in again.',
  EMAIL_SIGNUP_NOT_SUPPORTED: 'Signup requires a mobile number. Email login is supported for existing users.',

  // Seat Lock & Concurrency errors
  SEAT_LOCKED: 'This seat is currently held by another passenger. Please pick another seat.',
  SEAT_ALREADY_BOOKED: 'This seat was just confirmed by another passenger.',
  SEAT_LOCK_EXPIRED: 'Your 5-minute seat lock reservation timed out. Please select again.',
  LOCK_COUNT_EXCEEDED: 'Maximum seat allocation limit reached for this booking.',
  SEAT_NOT_AVAILABLE: 'This seat is not currently open for reservations.',

  // Booking & Payment errors
  PAYMENT_NOT_ALLOWED: 'Booking window expired (15-minute limit). Please start a new reservation.',
  BOOKING_EXPIRED: 'The 15-minute booking window has elapsed. Seats have been released.',
  BOOKING_NOT_CANCELLABLE: 'This trip cannot be cancelled at this stage.',
  IDEMPOTENCY_KEY_REUSED: 'Payment transaction collision detected. A fresh retry key has been generated.',
  INVALID_IDEMPOTENCY_KEY: 'Malformed payment transaction key.',
  SCHEDULE_CONFLICT: 'Trip timing conflict detected with another active schedule.',
  SCHEDULE_NOT_PUBLISHED: 'This transit route is not currently taking passenger reservations.',

  // Rate Limiting & Networking
  RATE_LIMITED: 'You are making requests too quickly. Please wait a moment and retry.',
  INTERNAL_ERROR: 'A transit gateway error occurred. Our engineers have been alerted.',
  SERVICE_UNAVAILABLE: 'Transit service temporarily degraded. Please try again in a few moments.',
  NOT_FOUND: 'The requested transit resource was not found.',
  FORBIDDEN: 'You do not have authorization to view or perform this action.',
  VALIDATION_ERROR: 'Submitted information failed verification. Please review highlighted fields.'
};

export function getErrorMessage(code: string, fallback?: string): string {
  return ERROR_MESSAGES[code] || fallback || 'An unexpected transit error occurred. Please try again.';
}
