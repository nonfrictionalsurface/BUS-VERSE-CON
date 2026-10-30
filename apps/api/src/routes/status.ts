import type { FastifyInstance } from 'fastify';
import { Client as PgClient } from 'pg';
import { Redis } from 'ioredis';

type CheckResult = {
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
};

export async function statusRoutes(server: FastifyInstance): Promise<void> {
  server.get('/v1/status', async (_request, reply) => {
    const checks: Record<string, CheckResult> = {};

    const pgStart = Date.now();
    try {
      const pg = new PgClient({ connectionString: process.env.DATABASE_URL });
      await pg.connect();
      await pg.query('SELECT 1');
      await pg.end();
      checks.postgres = { status: 'ok', latencyMs: Date.now() - pgStart };
    } catch (err) {
      checks.postgres = {
        status: 'error',
        error: (err as Error).message,
      };
    }

    const redisStart = Date.now();
    try {
      const redis = new Redis(process.env.REDIS_URL ?? '', {
        lazyConnect: false,
        maxRetriesPerRequest: 1,
      });
      await redis.ping();
      await redis.quit();
      checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
    } catch (err) {
      checks.redis = {
        status: 'error',
        error: (err as Error).message,
      };
    }

    const allOk = Object.values(checks).every((c) => c.status === 'ok');

    reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'ok' : 'degraded',
      checks,
    });
  });
}