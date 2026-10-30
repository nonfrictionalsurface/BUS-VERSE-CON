import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Integration tests share one Postgres DB and each beforeEach wipes all tables.
    // Parallel file execution causes cross-file FK violations (sessions_user_id_fkey, routes_origin_city_id_fkey).
    // Serialize files. Unit tests within a file still run normally.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/server.ts', 'src/workers/cron.worker.ts', 'src/workers/scheduler.ts', 'src/workers/replay-webhooks.worker.ts', 'src/workers/jobs/purge-gps-partitions.job.ts', 'src/routes/error-handler.ts', 'src/modules/admin/admin.types.ts'],
    },
  },
});