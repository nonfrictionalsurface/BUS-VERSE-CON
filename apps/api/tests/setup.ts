import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Set test env vars BEFORE any module that reads env.ts is imported
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.PORT = '4310';

process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:7542/busverse';
process.env.REDIS_URL = 'redis://:redis_dev_password@localhost:7543';

process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_chars_long_placeholder';
process.env.PII_ENCRYPTION_KEY = 'test_pii_key_at_least_32_chars_long_placeholder';
process.env.PHONE_HASH_SALT = 'test_phone_salt_at_least_32_chars_long_placeholder';

process.env.RAZORPAY_KEY_ID = 'rzp_test_xxx';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';

process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:3001';
process.env.MOCK_OTP = 'true';
process.env.MOCK_EMAIL = 'true';
process.env.MOCK_PAYMENT = 'true';
process.env.ENABLE_NOTIFICATIONS = 'false';
// Load .env.test from repo root to fill in QR_SIGNING_* (not set inline above).
// override: false — inline defaults stay authoritative for shared keys.
{
  const _dir = dirname(fileURLToPath(import.meta.url));
  loadDotenv({ path: resolve(_dir, '../../../.env.test'), override: false });
}
if (!process.env.QR_SIGNING_PRIVATE_KEY || !process.env.QR_SIGNING_PUBLIC_KEY) {
  throw new Error('QR_SIGNING_*_KEY missing after loading .env.test — regenerate into .env.test');
}