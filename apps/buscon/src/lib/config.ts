export const CONFIG = {
  API_BASE: process.env.NEXT_PUBLIC_API_BASE || '/api/v1',
  WS_URL:
    process.env.NEXT_PUBLIC_WS_URL ||
    (typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? 'wss://busverse-api.onrender.com'
      : 'http://localhost:4310'),
  IS_DEV: process.env.NEXT_PUBLIC_DEV_MODE === 'true',
  // Defaults TRUE unless explicitly "false" — demo buttons show even without env vars
  DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE !== 'false',
} as const;

export const DEMO = {
  operatorEmail: process.env.NEXT_PUBLIC_DEMO_OPERATOR_EMAIL || 'sharma@busverse.app',
  operatorPassword: process.env.NEXT_PUBLIC_DEMO_OPERATOR_PASSWORD || 'Demo1234!@Abc',
  adminEmail: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || 'admin@busverse.app',
  adminPassword: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || 'Demo1234!@AbcAdmin',
} as const;
