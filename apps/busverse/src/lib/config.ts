export const CONFIG = {
  API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4310/v1',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4310',
  RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
  IS_DEV: process.env.NEXT_PUBLIC_DEV_MODE === 'true',
  BOOKING_EXPIRY_MINUTES: 15,
  SEAT_LOCK_TTL_SECONDS: 300,
} as const;
