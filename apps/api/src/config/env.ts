import { z } from 'zod';

const boolEnv = z
  .string()
  .default('false')
  .transform((v) => v.toLowerCase() === 'true');

const EnvSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4310),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // Data stores
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  // Secrets
  JWT_SECRET: z.string().min(32),
  PII_ENCRYPTION_KEY: z.string().min(32),
  PHONE_HASH_SALT: z.string().min(32),

  // QR signing (generated in Phase 4)
  QR_SIGNING_PRIVATE_KEY: z.string().optional(),
  QR_SIGNING_PUBLIC_KEY: z.string().optional(),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

  // SMS
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),

  // Email
  SENDGRID_API_KEY: z.string().optional(),

  // R2
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),

  // CORS
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001,http://localhost:8081'),

  // Realtime (Phase 9) — test-overridable timing
  WS_AUTH_EXPIRING_LEAD_SEC: z.coerce.number().int().min(0).default(60),
  WS_AUTH_REFRESH_WINDOW_SEC: z.coerce.number().int().min(0).default(30),

  // Admin recovery
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_RECOVERY_TOKEN: z.string().optional(),

  // Webhook fallback
  TMP_WEBHOOKS_DIR: z.string().default('/tmp/webhooks'),

  // Demo
  DEMO_MULTI_DEVICE_DRIVER: boolEnv,

  // Mocks
  MOCK_OTP: boolEnv,
  MOCK_EMAIL: boolEnv,
  MOCK_PAYMENT: boolEnv,
  ENABLE_NOTIFICATIONS: boolEnv,

  // Observability (Phase 12)
  SENTRY_DSN: z.string().optional(),
  RAILWAY_ENVIRONMENT: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';