// -----------------------------------------------------------------
// Bootstrap: load .env BEFORE any module that reads process.env.
// This file must be the entry point (`pnpm dev` / `pnpm start`).
// ESM imports are hoisted, so dotenv loading CANNOT live in server.ts.
// -----------------------------------------------------------------
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In dev: load repo-root .env. In prod: file may not exist — Railway
// injects env vars directly, so `loadEnv` is a no-op.
const envPath = resolve(__dirname, '../../../.env');
const result = loadEnv({ path: envPath });

if (result.error && process.env.NODE_ENV !== 'production') {
  // Log a warning but don't crash — env.ts will give a clear error if a var is missing.
  console.warn(
    `[bootstrap] Could not load .env at ${envPath}: ${result.error.message}`,
  );
}

// Dynamic import — runs AFTER env is loaded into process.env.
await import('./server.js');