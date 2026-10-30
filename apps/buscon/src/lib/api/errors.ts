export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address before signing in.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  EMAIL_ALREADY_REGISTERED: 'This email is already registered.',
  PHONE_ALREADY_REGISTERED: 'This phone number is already registered.',
  GSTIN_ALREADY_REGISTERED: 'This GSTIN is already registered.',
  INVALID_GSTIN_FORMAT: 'GSTIN format is invalid.',
  INVALID_PAN_FORMAT: 'PAN format is invalid.',
  TOKEN_EXPIRED: 'Session expired. Please sign in again.',
  TOKEN_INVALID: 'Your session is invalid. Please sign in again.',
  SESSION_REVOKED: 'Your session has ended. Please sign in again.',
  FORBIDDEN: 'You do not have access to this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
  VALIDATION_ERROR: 'Some fields need attention.',
  ACCOUNT_PENDING_APPROVAL: 'Your account is awaiting admin approval.',
  ACCOUNT_SUSPENDED: 'Your account has been suspended. Contact support.',
  ACCOUNT_DEACTIVATED: 'Your account is inactive. Contact support.',

  // Bus
  BUS_REGISTRATION_EXISTS: 'A bus with this registration number already exists in your fleet. Use a different number or click 🎲 to generate a unique one.',
  BUS_NOT_FOUND: 'Bus not found.',
  BUS_LAYOUT_MISSING: 'This bus has no seat layout configured yet.',

  // Route
  ROUTE_SAME_CITY: 'Origin and destination cities must be different.',
  ROUTE_IN_USE: 'This route is used by existing schedules.',

  // Schedule
  SCHEDULE_CONFLICT: 'This bus already has an overlapping schedule.',
  SCHEDULE_HAS_BOOKINGS: 'Cannot modify this schedule — bookings exist.',

  // Driver
  LICENSE_ALREADY_REGISTERED: 'This driver license is already registered.',
  DRIVER_ON_DUTY: 'Cannot modify a driver who is currently on duty.',

  // Layout
  CAPACITY_MISMATCH: 'Seat count must match the bus capacity.',
};

export function getErrorMessage(code: string, fallback?: string): string {
  return ERROR_MESSAGES[code] || fallback || 'Something went wrong. Please try again.';
}

export function isApiError(err: unknown): err is { status: number; code: string; message: string; details?: any } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    'status' in err
  );
}