export const CONFIG = {
  API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4310/v1',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4310',
  DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE === 'true' || process.env.NODE_ENV !== 'production',
  RAZORPAY_KEY: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
} as const;
