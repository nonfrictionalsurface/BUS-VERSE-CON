export const CONFIG = {
  API_BASE: process.env.NEXT_PUBLIC_API_BASE || '/api/v1',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4310',
  IS_DEV: process.env.NEXT_PUBLIC_DEV_MODE === 'true',
  DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
} as const;

export const DEMO = {
  operatorEmail: process.env.NEXT_PUBLIC_DEMO_OPERATOR_EMAIL || '',
  operatorPassword: process.env.NEXT_PUBLIC_DEMO_OPERATOR_PASSWORD || '',
  adminEmail: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || '',
  adminPassword: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || '',
} as const;