import Fastify from 'fastify';
import { env } from './config/env.js';
import { registerMiddleware } from './middleware/index.js';
import { registerOpenApi } from './openapi.js';
import { healthRoutes } from './routes/health.js';
import { statusRoutes } from './routes/status.js';
import { registerNotFoundHandler } from './routes/not-found.js';
import { registerErrorHandler } from './routes/error-handler.js';
import { devRouter as operatorDevRouter } from './modules/dev/dev.router.js';

const PORT = env.PORT;
const HOST = '0.0.0.0';
const isDev = env.NODE_ENV !== 'production';

const server = Fastify({
  trustProxy: true,
  bodyLimit: 1024 * 1024,
  logger: isDev
    ? {
        level: env.LOG_LEVEL,
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }
    : { level: env.LOG_LEVEL },
});

// Preserve raw body for webhook signature verification. Must be registered
// BEFORE any route. Overrides the built-in application/json parser.
server.removeContentTypeParser('application/json');
server.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  (req as { rawBody?: Buffer }).rawBody = body as Buffer;
  try {
    const parsed = JSON.parse((body as Buffer).toString('utf8')) as unknown;
    done(null, parsed);
  } catch (err) {
    done(err as Error, undefined);
  }
});

server.setReplySerializer((payload) => {
  if (typeof payload === 'string') return payload;
  return JSON.stringify(payload, (_, value) => {
    if (typeof value === 'bigint') return Number(value);
    if (
      value &&
      typeof value === 'object' &&
      typeof (value as { toNumber?: unknown }).toNumber === 'function'
    ) {
      return (value as { toNumber: () => number }).toNumber();
    }
    return value;
  });
});

await registerMiddleware(server);
await registerOpenApi(server);

await server.register(healthRoutes);
  await server.register(operatorDevRouter, { prefix: '/v1' });
await server.register(statusRoutes);

// Phase 2 — Identity (dynamic import so env is loaded first, matching bootstrap.ts)
const { identityRouter } = await import('./modules/identity/identity.router.js');
await server.register(identityRouter, { prefix: '/v1' });

// Phase 3 — Network (public + operator buses + layout)
const { networkRouter } = await import('./modules/network/network.router.js');
await server.register(networkRouter, { prefix: '/v1' });

const { adminRouter } = await import('./modules/admin/admin.router.js');
await server.register(adminRouter, { prefix: '/v1' });
// Phase 4 - Booking + Payments + Dev mock
const { bookingRouter } = await import('./modules/booking/booking.router.js');
await server.register(bookingRouter, { prefix: '/v1' });

const { paymentsRouter } = await import('./modules/payments/payments.router.js');
await server.register(paymentsRouter, { prefix: '/v1' });

const { devRouter } = await import('./modules/payments/dev.router.js');
await server.register(devRouter, { prefix: '/v1' });

// Phase 5 - Webhooks (Razorpay signature-verified endpoint)
const { webhooksRouter } = await import('./modules/webhooks/webhooks.router.js');
await server.register(webhooksRouter, { prefix: '/v1' });

// Phase 6 - Trip + Driver surface (13 driver routes)
const { tripRouter } = await import('./modules/trip/trip.router.js');
await server.register(tripRouter, { prefix: '/v1' });

// Phase 7 - Audit module (2 admin endpoints)
const { auditRouter } = await import('./modules/audit/audit.router.js');
await server.register(auditRouter, { prefix: '/v1' });

// Phase 5 - Replay worker for DB-error fallback files
const { startReplayWorker } = await import('./workers/replay-webhooks.worker.js');
startReplayWorker();

await registerNotFoundHandler(server);
await registerErrorHandler(server);

// Phase 8 - start background workers (cron + webhook replay)
if (process.env.NODE_ENV !== 'test') {
  const { startScheduler } = await import('./workers/scheduler.js');
  const { startCronWorker } = await import('./workers/cron.worker.js');
  const { startWebhookReplayWorker } = await import('./workers/webhook-replay.worker.js');
  await startScheduler();
  startCronWorker();
  startWebhookReplayWorker();
  const { startAuditExportWorker } = await import('./workers/audit-export.worker.js');
  startAuditExportWorker();
}

try {
  await server.listen({ port: PORT, host: HOST });
  server.log.info(`API listening on http://${HOST}:${PORT}`);
  server.log.info(`Health:   http://${HOST}:${PORT}/v1/health`);
  server.log.info(`Status:   http://${HOST}:${PORT}/v1/status`);
  server.log.info(`Docs:     http://${HOST}:${PORT}/v1/docs`);
  const { attachRealtime } = await import('./realtime/server.js');
  attachRealtime(server.server);
  server.log.info(`Realtime: ws://${HOST}:${PORT}/v1/ws`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}

// Phase 5 - graceful shutdown
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  server.log.info({ signal }, 'shutdown: starting');
  try {
    const { stopReplayWorker } = await import('./workers/replay-webhooks.worker.js');
    stopReplayWorker();
  } catch { /* best-effort */ }
  try {
    const { stopScheduler } = await import('./workers/scheduler.js');
    stopScheduler();
  } catch { /* best-effort */ }
  try {
    const { stopCronWorker } = await import('./workers/cron.worker.js');
    await stopCronWorker();
  } catch { /* best-effort */ }
  try {
    const { stopWebhookReplayWorker } = await import('./workers/webhook-replay.worker.js');
    await stopWebhookReplayWorker();
  } catch { /* best-effort */ }
  try {
    const { stopAuditExportWorker } = await import('./workers/audit-export.worker.js');
    await stopAuditExportWorker();
  } catch { /* best-effort */ }
  try {
    const { closeQueues } = await import('./workers/queue.js');
    await closeQueues();
  } catch { /* best-effort */ }
  try {
    const { closeRealtime } = await import('./realtime/server.js');
    await closeRealtime();
  } catch { /* best-effort */ }
  try { await server.close(); } catch { /* best-effort */ }
  try {
    const { prisma } = await import('./lib/prisma.js');
    await prisma.$disconnect();
  } catch { /* best-effort */ }
  try {
    const { closeRedis } = await import('./lib/redis.js');
    await closeRedis();
  } catch { /* best-effort */ }
  process.exit(0);
}
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });