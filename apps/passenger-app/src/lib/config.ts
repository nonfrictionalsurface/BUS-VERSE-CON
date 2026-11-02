import { Platform } from 'react-native';

// Per 05-UI-SPEC §8, all API and WS URLs route through this config.
// Matches backend contracts in 07-API-AND-REALTIME-CONTRACTS §2.

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

function baseUrl(envKey: string, fallbackHost: string): string {
  const raw = (process.env as Record<string, string | undefined>)[envKey];
  if (raw && raw.length > 0) return raw.replace(/\/+$/, '');
  return fallbackHost;
}

export const CONFIG = {
  API_BASE: baseUrl('EXPO_PUBLIC_API_BASE', `http://${DEV_HOST}:4310/v1`),
  WS_URL: baseUrl('EXPO_PUBLIC_WS_URL', `http://${DEV_HOST}:4310`),
  WS_PATH: '/v1/ws',
  DEV_MODE: process.env.EXPO_PUBLIC_DEV_MODE === 'true',
  // Per 07 §10, seat lock TTL is 5 min, booking payment window 15 min.
  SEAT_LOCK_TTL_SECONDS: 300,
  PAYMENT_WINDOW_MINUTES: 15,
  // Per 04 §11.4, WS-to-poll fallback after 5 retries.
  WS_MAX_RETRIES: 5,
} as const;
