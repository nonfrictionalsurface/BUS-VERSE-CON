import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { adminRouter } from '../../src/modules/admin/admin.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createAdmin } from '../helpers/factories.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { issueSessionTokens } from '../../src/modules/identity/jwt.service.js';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(adminRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});

afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetIdentityTables(); });

async function setup(): Promise<{ token: string; paymentId: string; bookingId: string }> {
  const admin = await createAdmin();
  const { accessToken } = await issueSessionTokens({
    userId: admin.id,
    role: 'SUPER_ADMIN',
    sessionId: newUuid(),
  });
  const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 1, status: 'CONFIRMED' });
  const payment = await prisma.payment.findFirst({ where: { booking: { userId: seed.bookings[0]!.userId } } });
  return { token: accessToken, paymentId: payment!.id, bookingId: seed.bookings[0]!.id };
}

function auth(token: string) {
  return { authorization: `Bearer ${token}` };
}
describe('GET /v1/admin/payments', () => {
  it('returns 200 with empty array when no payments', async () => {
    const admin = await createAdmin();
    const { accessToken } = await issueSessionTokens({
      userId: admin.id,
      role: 'SUPER_ADMIN',
      sessionId: newUuid(),
    });
    const res = await app.inject({ method: 'GET', url: '/v1/admin/payments', headers: auth(accessToken) });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });

  it('returns 200 with one payment and shape checks', async () => {
    const { token } = await setup();
    const res = await app.inject({ method: 'GET', url: '/v1/admin/payments', headers: auth(token) });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(1);
    const p = res.json().data[0];
    expect(p.paymentId).toBeTruthy();
    expect(p.status).toBe('SUCCEEDED');
    expect(p.bookingReference).toMatch(/^BKG-/);
    expect(p.operator.companyName).toBeTruthy();
    expect(typeof p.amountPaise).toBe('number');
  });

  it('filter by status=SUCCEEDED returns 1; status=FAILED returns 0', async () => {
    const { token } = await setup();
    const ok = await app.inject({ method: 'GET', url: '/v1/admin/payments?status=SUCCEEDED', headers: auth(token) });
    expect(ok.json().data.length).toBe(1);
    const none = await app.inject({ method: 'GET', url: '/v1/admin/payments?status=FAILED', headers: auth(token) });
    expect(none.json().data.length).toBe(0);
  });

  it('GET /admin/payments/:id returns full shape with refunds + webhookCount', async () => {
    const { token, paymentId } = await setup();
    const res = await app.inject({ method: 'GET', url: `/v1/admin/payments/${paymentId}`, headers: auth(token) });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.paymentId).toBe(paymentId);
    expect(Array.isArray(res.json().data.refunds)).toBe(true);
    expect(typeof res.json().data.webhookCount).toBe('number');
  });
});

describe('GET /v1/admin/payments/:id — 404', () => {
  it('unknown id returns 404 NOT_FOUND', async () => {
    const { token } = await setup();
    const res = await app.inject({ method: 'GET', url: `/v1/admin/payments/${newUuid()}`, headers: auth(token) });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });
});

describe('GET /v1/admin/refunds', () => {
  it('returns 200 with empty array when no refunds', async () => {
    const { token } = await setup();
    const res = await app.inject({ method: 'GET', url: '/v1/admin/refunds', headers: auth(token) });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });
});

describe('POST /v1/admin/payments/:id/refund', () => {
  it('success creates refund row + audit row, returns 201', async () => {
    const { token, paymentId } = await setup();
    const body = { amountPaise: 1000, reason: 'Customer dispute investigation' };
    const res = await app.inject({ method: 'POST', url: `/v1/admin/payments/${paymentId}/refund`, headers: auth(token), payload: body });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.refundId).toBeTruthy();
    expect(res.json().data.refundTier).toBe('TIER_FULL');
    expect(res.json().data.amountPaise).toBe(1000);
    const refundRow = await prisma.refund.findFirst({ where: { paymentId } });
    expect(refundRow).not.toBeNull();
    const audit = await prisma.auditLog.findFirst({ where: { action: 'admin_refund_initiated', entityId: paymentId } });
    expect(audit).not.toBeNull();
    expect(audit!.reason).toContain('dispute');
  });

  it('missing reason fails zod → 422 VALIDATION_ERROR', async () => {
    const { token, paymentId } = await setup();
    const res = await app.inject({ method: 'POST', url: `/v1/admin/payments/${paymentId}/refund`, headers: auth(token), payload: { amountPaise: 1000 } });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('refund amount > payment amount → 400 REFUND_EXCEEDS_PAYMENT', async () => {
    const { token, paymentId } = await setup();
    const res = await app.inject({ method: 'POST', url: `/v1/admin/payments/${paymentId}/refund`, headers: auth(token), payload: { amountPaise: 999999, reason: 'Customer dispute investigation' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('REFUND_EXCEEDS_PAYMENT');
  });
});