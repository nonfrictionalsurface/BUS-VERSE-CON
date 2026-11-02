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

  BUS_REGISTRATION_EXISTS: 'A bus with this registration number already exists in your fleet.',
  BUS_NOT_FOUND: 'Bus not found.',
  BUS_LAYOUT_MISSING: 'This bus has no seat layout configured yet.',

  ROUTE_SAME_CITY: 'Origin and destination cities must be different.',
  ROUTE_IN_USE: 'This route is used by existing schedules.',

  SCHEDULE_CONFLICT: 'This bus already has an overlapping schedule.',
  SCHEDULE_HAS_BOOKINGS: 'Cannot delete — passengers have booked this schedule. Cancel and refund first.',
  SCHEDULE_HAS_ACTIVE_TRIP: 'Cannot delete — this schedule has an active or completed trip.',
  INVALID_SCHEDULE: 'This schedule cannot be assigned — it must be PUBLISHED and in the future.',

  LICENSE_ALREADY_REGISTERED: 'This driver license is already registered.',
  DRIVER_ON_DUTY: 'Cannot modify a driver who is currently on duty.',
  DRIVER_NOT_VERIFIED: 'This driver has not completed KYC verification.',
  DRIVER_BLOCKED: 'This driver is blocked or deactivated.',

  ACTIVE_TRIP_EXISTS: 'This driver already has an overlapping trip.',
  INVALID_TRANSITION: 'This action is not valid for the current state.',

  CAPACITY_MISMATCH: 'Seat count must match the bus capacity.',
};

export function getErrorMessage(code: string, fallback?: string): string {
  return ERROR_MESSAGES[code] || fallback || 'Something went wrong. Please try again.';
}

export function isApiError(err: unknown): err is { status: number; code: string; message: string; details?: any } {
  return (
    typeof err === 'object' && err !== null && 'code' in err && 'message' in err && 'status' in err
  );
}