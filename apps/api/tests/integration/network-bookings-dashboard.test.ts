import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { networkRouter } from '../../src/modules/network/network.router.js';
import { identityRouter } from '../../src/modules/identity/identity.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createOperator } from '../helpers/factories.js';
import { loginAsOperator } from '../helpers/auth.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { prisma } from '../../src/lib/prisma.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(identityRouter, { prefix: '/v1' });
  await app.register(networkRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});
afterAll(async () => { await app.close(); });

beforeEach(async () => {
  await resetIdentityTables();
  await prisma.payment.deleteMany({});
  await prisma.bookingPassenger.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.routeStand.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.seat.deleteMany({});
  await prisma.seatLayout.deleteMany({});
  await prisma.bus.deleteMany({});
  await prisma.stand.deleteMany({});
  await prisma.city.deleteMany({});
});

async function loginAsOwner(email: string) {
  await createOperator({ email, password: 'correct horse battery staple' });
  return loginAsOperator(app, email, 'correct horse battery staple');
}

describe('GET /v1/operator/bookings', () => {
  it('returns empty initially', async () => {
    const { accessToken } = await loginAsOwner('op@test.example');
    const res = await app.inject({ method: 'GET', url: '/v1/operator/bookings', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });
  it('returns seeded booking with masked PII', async () => {
    const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 2 });
    const { accessToken } = await loginAsOperator(app, seed.opUser.email!, 'correct horse battery staple');
    const res = await app.inject({ method: 'GET', url: '/v1/operator/bookings', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    const data = res.json().data as Array<{ bookingReference: string; passengers: Array<{ phone?: string; email?: string; idNumber?: string; name: string; seatLabel: string }>; passengerCount: number }>;
    expect(data.length).toBe(1);
    expect(data[0]!.passengerCount).toBe(2);
    for (const p of data[0]!.passengers) {
      expect(p.phone).toBeUndefined();
      expect(p.email).toBeUndefined();
      expect(p.idNumber).toBeUndefined();
      expect(p.name).toBeDefined();
      expect(p.seatLabel).toBeTruthy();
    }
  });
});

describe('GET /v1/operator/bookings/:id', () => {
  it('returns detail with full sections', async () => {
    const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 1 });
    const { accessToken } = await loginAsOperator(app, seed.opUser.email!, 'correct horse battery staple');
    const res = await app.inject({ method: 'GET', url: `/v1/operator/bookings/${seed.bookings[0]!.id}`, headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    const d = res.json().data;
    expect(d.bookingId).toBe(seed.bookings[0]!.id);
    expect(d.schedule.departureTime).toBeDefined();
    expect(d.boardingStand.name).toBeDefined();
    expect(d.droppingStand.name).toBeDefined();
    expect(d.fareBreakdown.baseFarePaise).toBe(45000);
    expect(d.payment.status).toBe('SUCCEEDED');
  });
  it('404 for another operator\'s booking', async () => {
    const seed = await seedBookingScenario({ bookingCount: 1 });
    const other = await loginAsOwner('other@test.example');
    const res = await app.inject({ method: 'GET', url: `/v1/operator/bookings/${seed.bookings[0]!.id}`, headers: { authorization: `Bearer ${other.accessToken}` } });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /v1/operator/dashboard', () => {
  it('returns zeros when empty', async () => {
    const { accessToken } = await loginAsOwner('op@test.example');
    const res = await app.inject({ method: 'GET', url: '/v1/operator/dashboard', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    const d = res.json().data;
    expect(d.today.bookingsCount).toBe(0);
    expect(d.today.revenuePaise).toBe(0);
    expect(d.activeTrips).toBe(0);
  });
  it('reflects today\'s bookings and revenue', async () => {
    const seed = await seedBookingScenario({ bookingCount: 2, passengersPerBooking: 2 });
    const { accessToken } = await loginAsOperator(app, seed.opUser.email!, 'correct horse battery staple');
    const res = await app.inject({ method: 'GET', url: '/v1/operator/dashboard', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    const d = res.json().data;
    expect(d.today.bookingsCount).toBe(2);
    expect(d.today.passengerCount).toBe(4);
    expect(d.today.revenuePaise).toBeGreaterThan(0);
  });
});

describe('GET /v1/operator/revenue', () => {
  it('422 without from/to', async () => {
    const { accessToken } = await loginAsOwner('op@test.example');
    const res = await app.inject({ method: 'GET', url: '/v1/operator/revenue', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(422);
  });
  it('returns buckets within range', async () => {
    const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 2 });
    const { accessToken } = await loginAsOperator(app, seed.opUser.email!, 'correct horse battery staple');
    const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    const res = await app.inject({ method: 'GET', url: `/v1/operator/revenue?from=${today}&to=${today}&groupBy=day`, headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    const d = res.json().data;
    expect(d.totalRevenuePaise).toBeGreaterThan(0);
    expect(d.buckets.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /v1/operator/revenue/daily', () => {
  it('returns 7 days', async () => {
    const { accessToken } = await loginAsOwner('op@test.example');
    const res = await app.inject({ method: 'GET', url: '/v1/operator/revenue/daily', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    const d = res.json().data;
    expect(d.days.length).toBe(7);
    expect(d.timezone).toBe('Asia/Kolkata');
  });
});

describe('GET /v1/operator/settlements', () => {
  it('returns empty with note', async () => {
    const { accessToken } = await loginAsOwner('op@test.example');
    const res = await app.inject({ method: 'GET', url: '/v1/operator/settlements', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.note).toContain('Phase 5');
  });
});

describe('GET /v1/operator/me/managers', () => {
  it('returns self as OWNER for owner', async () => {
    const { accessToken } = await loginAsOwner('op@test.example');
    const res = await app.inject({ method: 'GET', url: '/v1/operator/me/managers', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    const data = res.json().data as Array<{ role: string }>;
    expect(data.length).toBe(1);
    expect(data[0]!.role).toBe('OWNER');
  });
  it('403 for MANAGER', async () => {
    await createOperator({ email: 'mgr@test.example', role: 'MANAGER', password: 'correct horse battery staple' });
    const { accessToken } = await loginAsOperator(app, 'mgr@test.example', 'correct horse battery staple');
    const res = await app.inject({ method: 'GET', url: '/v1/operator/me/managers', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(403);
  });
});