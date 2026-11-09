export const CONFIG = {
  API_BASE: process.env.NEXT_PUBLIC_API_BASE ?? '/api/v1',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4310',
  DEV_MODE: process.env.NEXT_PUBLIC_DEV_MODE === 'true',
} as const;
