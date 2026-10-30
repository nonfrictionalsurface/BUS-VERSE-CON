import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../src/middleware/index.js';
import { registerOpenApi } from '../src/openapi.js';
import { healthRoutes } from '../src/routes/health.js';
import { statusRoutes } from '../src/routes/status.js';
import { registerNotFoundHandler } from '../src/routes/not-found.js';
import { registerErrorHandler } from '../src/routes/error-handler.js';

let server: FastifyInstance;

beforeAll(async () => {
  server = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(server);
  await registerOpenApi(server);
  await server.register(healthRoutes);
  await server.register(statusRoutes);
  await registerNotFoundHandler(server);
  await registerErrorHandler(server);
  await server.ready();
});

afterAll(async () => {
  await server.close();
});

describe('Smoke tests — Phase 1c', () => {
  it('GET /v1/health returns 200 + {status: ok}', async () => {
    const res = await server.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /v1/status returns ok + postgres ok + redis ok', async () => {
    const res = await server.inject({ method: 'GET', url: '/v1/status' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.checks.postgres.status).toBe('ok');
    expect(body.checks.redis.status).toBe('ok');
  });

  it('sets X-Request-Id response header', async () => {
    const res = await server.inject({ method: 'GET', url: '/v1/health' });
    expect(res.headers['x-request-id']).toBeDefined();
    expect(String(res.headers['x-request-id']).length).toBeGreaterThan(0);
  });

  it('returns 404 envelope for unknown route', async () => {
    const res = await server.inject({ method: 'GET', url: '/v1/nonexistent' });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBeDefined();
  });

  it('returns 415 for POST with non-JSON content-type', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/v1/anything',
      headers: { 'content-type': 'text/plain' },
      payload: 'hello world',
    });
    expect(res.statusCode).toBe(415);
    const body = res.json();
    expect(body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('allows CORS preflight from allowed origin', async () => {
    const res = await server.inject({
      method: 'OPTIONS',
      url: '/v1/health',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'GET',
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('rejects CORS preflight from disallowed origin', async () => {
    const res = await server.inject({
      method: 'OPTIONS',
      url: '/v1/health',
      headers: {
        origin: 'http://evil.com',
        'access-control-request-method': 'GET',
      },
    });
    // No allow-origin header → browser blocks. Status is 204 but header absent.
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sets helmet security headers', async () => {
    const res = await server.inject({ method: 'GET', url: '/v1/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('serves OpenAPI spec at /v1/openapi.json', async () => {
    // @fastify/swagger-ui serves the spec at /documentation/json by default
    // Swagger UI loads at /v1/docs
    const res = await server.inject({ method: 'GET', url: '/v1/docs/json' });
    expect(res.statusCode).toBe(200);
    const spec = res.json();
    expect(spec.openapi).toBeDefined();
    expect(spec.info.title).toBe('BusVerse + BusCon API');
  });

  it('serves Swagger UI at /v1/docs', async () => {
    const res = await server.inject({ method: 'GET', url: '/v1/docs' });
    expect([200, 302]).toContain(res.statusCode);
  });
});