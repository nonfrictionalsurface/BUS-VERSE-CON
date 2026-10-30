import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { identityRouter } from '../../src/modules/identity/identity.router.js';
import { networkRouter } from '../../src/modules/network/network.router.js';
import { adminRouter } from '../../src/modules/admin/admin.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createAdmin } from '../helpers/factories.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { loginAsAdmin } from '../helpers/auth.js';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(identityRouter, { prefix: '/v1' });
  await app.register(networkRouter, { prefix: '/v1' });
  await app.register(adminRouter, { prefix: '/v1' });
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
  await prisma.operator.deleteMany({});
});

async function adminLogin() {
  await createAdmin({ email: 'admin@test.example' });
  return loginAsAdmin(app, 'admin@test.example', 'correct horse battery staple!!!');
}

describe('GET /v1/admin/bookings', () => {
  it('lists all bookings with masked passenger PII', async () => {
    const seed = await seedBookingScenario({ bookingCount: 2, passengersPerBooking: 1 });
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'GET', url: '/v1/admin/bookings',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data as any[];
    expect(data.length).toBe(2);
    for (const b of data) {
      expect(b.passengers[0].name).toBeTruthy();
      expect(b.passengers[0].phone).toBeUndefined();
      expect(b.passengers[0].email).toBeUndefined();
      expect(b.passengers[0].idNumber).toBeUndefined();
      expect(b.pii).toBeUndefined();
    }
  });
});

describe('GET /v1/admin/bookings/:id', () => {
  it('returns masked booking without includePii', async () => {
    const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 1 });
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'GET', url: `/v1/admin/bookings/${seed.bookings[0]!.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json().data;
    expect(body.pii).toBeUndefined();
    expect(body.passengers[0].idNumber).toBeUndefined();
  });

  it('unmasks PII with includePii=true + reason + writes audit row', async () => {
    const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 1 });
    // Set an idNumber so we can prove unmask happened
    const passenger = await prisma.bookingPassenger.findFirst({ where: { bookingId: seed.bookings[0]!.id } });
    await prisma.bookingPassenger.update({
      where: { id: passenger!.id },
      data: { idNumber: 'AADHAAR-1234-5678' },
    });

    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'GET',
      url: `/v1/admin/bookings/${seed.bookings[0]!.id}?includePii=true&reason=Customer%20dispute`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json().data;
    expect(body.pii).toBeTruthy();
    expect(body.pii.userPhone).toBeTruthy();
    expect(body.pii.auditLogId).toBeTruthy();
    expect(body.passengers[0].idNumber).toBe('AADHAAR-1234-5678');

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'Booking', entityId: seed.bookings[0]!.id, action: 'pii_accessed' },
    });
    expect(audit).toBeTruthy();
    expect(audit?.reason).toBe('Customer dispute');
  });

  it('400 REASON_REQUIRED when includePii=true without reason', async () => {
    const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 1 });
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'GET', url: `/v1/admin/bookings/${seed.bookings[0]!.id}?includePii=true`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('REASON_REQUIRED');
  });
});

describe('GET /v1/admin/dashboard', () => {
  it('returns aggregate counts and revenue', async () => {
    await seedBookingScenario({ bookingCount: 2, passengersPerBooking: 1 });
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'GET', url: '/v1/admin/dashboard',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const d = res.json().data;
    expect(d.operators.total).toBeGreaterThanOrEqual(1);
    expect(d.buses.total).toBeGreaterThanOrEqual(1);
    expect(d.schedules.published).toBeGreaterThanOrEqual(1);
    expect(d.bookings.total).toBeGreaterThanOrEqual(2);
    expect(d.revenue.totalPaise).toBeGreaterThan(0);
  });
});

describe('GET /v1/admin/schedules', () => {
  it('lists schedules across all operators', async () => {
    const seed = await seedBookingScenario({ bookingCount: 0 });
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'GET', url: '/v1/admin/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data as any[];
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.some((s) => s.id === seed.schedule.id)).toBe(true);
  });
});

describe('POST /v1/admin/schedules/:id/approve', () => {
  it('publishes DRAFT schedule and writes audit row', async () => {
    const seed = await seedBookingScenario({ bookingCount: 0 });
    // Create a DRAFT schedule (seed creates a PUBLISHED one)
    const draft = await prisma.schedule.create({
      data: {
        id: newUuid(),
        operatorId: seed.operatorId,
        busId: seed.bus.id,
        routeId: seed.route.id,
        departureTime: new Date(Date.now() + 48 * 3600 * 1000),
        arrivalTime: new Date(Date.now() + 56 * 3600 * 1000),
        fareAmountPaise: 45000n,
        fareCurrency: 'INR',
        status: 'DRAFT',
      },
    });

    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'POST', url: `/v1/admin/schedules/${draft.id}/approve`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { reason: 'timing verified against RTO guideline' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('PUBLISHED');

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'Schedule', entityId: draft.id, action: 'schedule_approved' },
    });
    expect(audit).toBeTruthy();
  });

  it('idempotent no-op when already PUBLISHED (no audit row)', async () => {
    const seed = await seedBookingScenario({ bookingCount: 0 });
    // seed.schedule is already PUBLISHED
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'POST', url: `/v1/admin/schedules/${seed.schedule.id}/approve`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { reason: 'approving again' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('PUBLISHED');
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'Schedule', entityId: seed.schedule.id, action: 'schedule_approved' },
    });
    expect(audit).toBeNull();
  });
});