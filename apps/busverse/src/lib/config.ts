const isProd = process.env.NODE_ENV === 'production';

export const CONFIG = {
  API_BASE:
    process.env.NEXT_PUBLIC_API_BASE ||
    (isProd ? 'https://busverse-api.onrender.com/v1' : 'http://localhost:4310/v1'),
  WS_URL:
    process.env.NEXT_PUBLIC_WS_URL ||
    (typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? 'wss://busverse-api.onrender.com'
      : 'http://localhost:4310'),
  DEV_MODE:
    process.env.NEXT_PUBLIC_DEV_MODE === 'true' || process.env.NODE_ENV !== 'production',
  RAZORPAY_KEY: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
} as const;
