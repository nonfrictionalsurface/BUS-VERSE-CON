export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'VALIDATION_ERROR'
  | 'INVALID_PHONE_FORMAT'
  | 'INVALID_EMAIL_FORMAT'
  | 'INVALID_SCHEDULE_TIMES'
  | 'ROUTE_SAME_CITY'
  | 'INVALID_CAPACITY'
  | 'INVALID_STATUS'
  | 'INVALID_TRANSITION'
  | 'BOOKING_IMMUTABLE'
  | 'REFUND_EXCEEDS_PAYMENT'
  | 'PAYMENT_NOT_REFUNDABLE'
  | 'PAYMENT_NOT_ALLOWED'
  | 'REASON_REQUIRED'
  | 'SCAN_EXPIRED'
  | 'RESET_TOKEN_INVALID'
  | 'RESET_TOKEN_EXPIRED'
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'EMAIL_SIGNUP_NOT_SUPPORTED'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'REFRESH_TOKEN_REPLAYED'
  | 'SESSION_REVOKED'
  | 'FORBIDDEN'
  | 'TRIP_NOT_ASSIGNED'
  | 'LICENSE_EXPIRED'
  | 'EMAIL_NOT_VERIFIED'
  | 'NOT_FOUND'
  | 'SEAT_LOCKED'
  | 'SEAT_ALREADY_BOOKED'
  | 'PHONE_ALREADY_REGISTERED'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'GSTIN_ALREADY_REGISTERED'
  | 'BUS_REGISTRATION_EXISTS'
  | 'LICENSE_ALREADY_REGISTERED'
  | 'DRIVER_ON_DUTY'
  | 'TRIP_ALREADY_STARTED'
  | 'SCHEDULE_HAS_BOOKINGS'
  | 'ROUTE_IN_USE'
  | 'LAYOUT_IN_USE'
  | 'SCHEDULE_CONFLICT'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'PAYMENT_ALREADY_SUCCEEDED'
  | 'RATE_LIMITED'
  | 'OTP_ATTEMPTS_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'BOOKING_REFERENCE_COLLISION'
  | 'INVOICE_NUMBER_COLLISION'
  | 'SERVICE_UNAVAILABLE'
  | 'GATEWAY_TIMEOUT'
  | 'SCHEDULE_DEPARTED'
  | 'INVALID_SEAT'
  | 'INVALID_SCHEDULE'
  | 'LOCK_EXPIRED'
  | 'LOCK_NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_COORDINATES'
  | 'INVALID_ACCURACY'
  | 'TELEPORT_DETECTED'
  | 'TRIP_NOT_IN_PROGRESS'
  | 'TRIP_NOT_ACTIVE'
  | 'TRIP_OUTSIDE_WINDOW'
  | 'ACTIVE_TRIP_EXISTS'
  | 'BUS_NOT_APPROVED'
  | 'BUS_LAYOUT_MISSING'
  | 'SCHEDULE_CANCELLED'
  | 'DRIVER_NOT_VERIFIED'
  | 'DRIVER_BLOCKED'
  | 'INVALID_SIGNATURE'
  | 'INVALID_BOOKING'
  | 'INVALID_TRIP';

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly httpStatus: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

function make(code: ErrorCode, status: number, message: string, details?: Record<string, unknown>) {
  return new DomainError(code, status, message, details);
}

export const errors = {
  // Generic
  invalidRequest: (msg = 'Invalid request', details?: Record<string, unknown>) =>
    make('INVALID_REQUEST', 400, msg, details),
  validationError: (msg = 'Validation failed', details?: Record<string, unknown>) =>
    make('VALIDATION_ERROR', 422, msg, details),
  unauthorized: (msg = 'Unauthorized') => make('UNAUTHORIZED', 401, msg),
  forbidden: (msg = 'Forbidden') => make('FORBIDDEN', 403, msg),
  notFound: (msg = 'Not found') => make('NOT_FOUND', 404, msg),
  rateLimited: (msg = 'Too many requests') => make('RATE_LIMITED', 429, msg),
  internal: (msg = 'Internal error') => make('INTERNAL_ERROR', 500, msg),
  serviceUnavailable: (msg = 'Service unavailable') => make('SERVICE_UNAVAILABLE', 503, msg),
  gatewayTimeout: (msg = 'Upstream timeout') => make('GATEWAY_TIMEOUT', 504, msg),
  payloadTooLarge: (msg = 'Payload too large') => make('PAYLOAD_TOO_LARGE', 400, msg),

  // Auth
  invalidOtp: () => make('INVALID_OTP', 400, 'Invalid OTP'),
  otpExpired: () => make('OTP_EXPIRED', 400, 'OTP expired'),
  otpAttemptsExceeded: () => make('OTP_ATTEMPTS_EXCEEDED', 429, 'Too many OTP attempts'),
  invalidCredentials: () => make('INVALID_CREDENTIALS', 401, 'Invalid credentials'),
  emailNotVerified: () => make('EMAIL_NOT_VERIFIED', 403, 'Email not verified'),
  sessionRevoked: () => make('SESSION_REVOKED', 401, 'Session revoked'),
  refreshReplayed: () => make('REFRESH_TOKEN_REPLAYED', 401, 'Refresh token replayed'),
  resetTokenInvalid: () => make('RESET_TOKEN_INVALID', 400, 'Invalid reset token'),
  resetTokenExpired: () => make('RESET_TOKEN_EXPIRED', 400, 'Reset token expired'),
  emailSignupNotSupported: () =>
    make('EMAIL_SIGNUP_NOT_SUPPORTED', 400, 'Email signup not supported'),

  // Registration
  phoneAlreadyRegistered: () => make('PHONE_ALREADY_REGISTERED', 409, 'Phone already registered'),
  emailAlreadyRegistered: () => make('EMAIL_ALREADY_REGISTERED', 409, 'Email already registered'),
  gstinAlreadyRegistered: () => make('GSTIN_ALREADY_REGISTERED', 409, 'GSTIN already registered'),

  // Booking
  seatLocked: (seatId: string) => make('SEAT_LOCKED', 409, 'Seat locked', { seatId }),
  seatAlreadyBooked: (seatId: string) =>
    make('SEAT_ALREADY_BOOKED', 409, 'Seat already booked', { seatId }),
  bookingImmutable: () =>
    make('BOOKING_IMMUTABLE', 400, 'Booking is immutable after confirmation'),
  invalidTransition: (msg = 'Invalid state transition') => make('INVALID_TRANSITION', 400, msg),
  driverOnDuty: () => make('DRIVER_ON_DUTY', 409, 'Driver is on duty'),

  // Payment
  paymentNotAllowed: (currentStatus?: string) =>
    make('PAYMENT_NOT_ALLOWED', 400, 'Payment not allowed in current booking state', {
      currentStatus,
    }),
  paymentNotRefundable: () => make('PAYMENT_NOT_REFUNDABLE', 400, 'Payment not refundable'),
  refundExceedsPayment: () => make('REFUND_EXCEEDS_PAYMENT', 400, 'Refund exceeds payment amount'),
  idempotencyKeyReused: () =>
    make('IDEMPOTENCY_KEY_REUSED', 409, 'Idempotency key reused with different body'),
  paymentAlreadySucceeded: () => make('PAYMENT_ALREADY_SUCCEEDED', 409, 'Payment already succeeded'),

  // Trip / scan
  tripNotAssigned: () => make('TRIP_NOT_ASSIGNED', 403, 'Trip not assigned'),
  tripAlreadyStarted: () => make('TRIP_ALREADY_STARTED', 409, 'Trip already started'),
  licenseExpired: () => make('LICENSE_EXPIRED', 403, 'License expired'),
  scanExpired: () => make('SCAN_EXPIRED', 400, 'Scan too old'),
  licenseAlreadyRegistered: () =>
    make('LICENSE_ALREADY_REGISTERED', 409, 'License already registered'),

  // Schedule / route
  invalidScheduleTimes: () =>
    make('INVALID_SCHEDULE_TIMES', 400, 'Arrival must be after departure'),
  routeSameCity: () => make('ROUTE_SAME_CITY', 400, 'Origin and destination must differ'),
  invalidCapacity: () => make('INVALID_CAPACITY', 400, 'Invalid capacity'),
  scheduleHasBookings: (n: number) =>
    make('SCHEDULE_HAS_BOOKINGS', 409, 'Schedule has bookings', { bookings: n }),
  routeInUse: (n: number) => make('ROUTE_IN_USE', 409, 'Route in use by schedules', { schedules: n }),
  layoutInUse: (details: Record<string, unknown>) =>
    make('LAYOUT_IN_USE', 409, 'Seat layout change conflicts with active bookings or seat locks', details),
  scheduleConflict: (conflictingScheduleId: string, departureTime: string, arrivalTime: string) =>
    make('SCHEDULE_CONFLICT', 409, 'Bus has an overlapping schedule', { conflictingScheduleId, departureTime, arrivalTime }),
  busRegistrationExists: () => make('BUS_REGISTRATION_EXISTS', 409, 'Bus registration exists'),
  reasonRequired: (msg = 'Reason required') => make('REASON_REQUIRED', 400, msg),

  // Validation
  invalidPhoneFormat: () => make('INVALID_PHONE_FORMAT', 400, 'Invalid phone format'),
  invalidEmailFormat: () => make('INVALID_EMAIL_FORMAT', 400, 'Invalid email format'),
  invalidStatus: (msg = 'Invalid status') => make('INVALID_STATUS', 400, msg),
  // Phase 4 additions (shared/03 §2.2, §9.3)
  scheduleDeparted: () => make('SCHEDULE_DEPARTED', 409, 'Schedule has already departed'),
  invalidSeat: () => make('INVALID_SEAT', 400, 'Seat does not belong to this schedule'),
  invalidSchedule: () => make('INVALID_SCHEDULE', 400, 'Schedule is not published or does not exist'),
  lockExpired: (seatId?: string) => make('LOCK_EXPIRED', 400, 'Seat lock has expired', seatId ? { seatId } : undefined),
  lockNotFound: () => make('LOCK_NOT_FOUND', 400, 'Seat lock not found or does not belong to you'),

  // Collisions (rare, retry)
  bookingReferenceCollision: () =>
    make('BOOKING_REFERENCE_COLLISION', 500, 'Reference collision, retry'),
  invoiceNumberCollision: () => make('INVOICE_NUMBER_COLLISION', 500, 'Invoice collision, retry'),

  // GPS provenance (Phase 6 — buscon/04 §11.2)
  invalidCoordinates: () => make('INVALID_COORDINATES', 400, 'Invalid GPS coordinates', { reason: 'coords_invalid' }),
  invalidAccuracy: () => make('INVALID_ACCURACY', 400, 'GPS accuracy too poor (>100m)', { reason: 'accuracy_poor' }),
  teleportDetected: (impliedSpeedKmh: number) =>
    make('TELEPORT_DETECTED', 400, 'Implied speed exceeds plausible maximum', { impliedSpeedKmh, maxSpeedKmh: 200 }),

  // Trip lifecycle (Phase 6 - buscon/02)
  tripNotInProgress: () => make('TRIP_NOT_IN_PROGRESS', 409, 'Trip is not in progress'),
  tripNotActive: () =>
    make('TRIP_NOT_ACTIVE', 409, 'Trip is not active (completed or cancelled)'),
  tripOutsideWindow: (windowMinutes: number) =>
    make('TRIP_OUTSIDE_WINDOW', 409, `Trip can only be started within +/-${windowMinutes} min of departure`, { windowMinutes }),
  activeTripExists: (existingTripId: string) =>
    make('ACTIVE_TRIP_EXISTS', 409, 'Driver already has an active trip', { existingTripId }),
  busNotApproved: () => make('BUS_NOT_APPROVED', 403, 'Bus is not approved'),
  busLayoutMissing: () => make('BUS_LAYOUT_MISSING', 403, 'Bus has no seat layout configured'),
  scheduleCancelled: () => make('SCHEDULE_CANCELLED', 409, 'Schedule has been cancelled'),
  driverNotVerified: () => make('DRIVER_NOT_VERIFIED', 403, 'Driver KYC is not verified'),
  driverBlocked: () => make('DRIVER_BLOCKED', 403, 'Driver account is blocked or deactivated'),

  // Scan results (Phase 6 - buscon/05)
  invalidSignature: () => make('INVALID_SIGNATURE', 400, 'QR signature is invalid'),
  invalidBooking: (reason?: string) =>
    make('INVALID_BOOKING', 400, reason ?? 'Booking is not eligible for boarding'),
  invalidTrip: (reason?: string) =>
    make('INVALID_TRIP', 400, reason ?? 'Ticket is not valid for this trip'),
};