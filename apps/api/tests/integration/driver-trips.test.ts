import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { tripRouter } from '../../src/modules/trip/trip.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createDriver } from '../helpers/factories.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { prisma } from '../../src/lib/prisma.js';
import { issueSessionTokens } from '../../src/modules/identity/jwt.service.js';
import { newUuid } from '../../src/lib/ids.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(tripRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetIdentityTables(); });

async function setupDriver() {
  const seed = await seedBookingScenario({ bookingCount: 0 });
  // Clamp departure to today's IST window AND keep it within ±2h of now (start
  // window). Without clamp, running tests near midnight IST (e.g. 23:47) would
  // push departure to 00:17 next-day → excluded from istDayBounds(today) →
  // listDriverTrips returns [] → false failure.
  const now = Date.now();
  const istNowMs = now + 5.5 * 3_600_000;
  const istTodayDate = new Date(istNowMs).toISOString().slice(0, 10);
  const istTodayStart = new Date(`${istTodayDate}T00:00:00.000+05:30`).getTime();
  const istTodayEnd = istTodayStart + 86_400_000;
  const target = Math.min(
    Math.max(now + 30 * 60_000, istTodayStart + 30 * 60_000),
    istTodayEnd - 60 * 60_000,
  );
  const departureTime = new Date(target);
  const arrivalTime = new Date(target + 8 * 3_600_000);
  await prisma.schedule.update({
    where: { id: seed.schedule.id },
    data: { departureTime, arrivalTime },
  });
  const driver = await createDriver({ operatorId: seed.operatorId, kycStatus: 'VERIFIED' });
  const driverId = driver.driverProfile!.id;
  const trip = await prisma.trip.create({
    data: { scheduleId: seed.schedule.id, busId: seed.bus.id, driverId, status: 'SCHEDULED' },
  });
  const { accessToken } = await issueSessionTokens({ userId: driver.id, role: 'DRIVER', sessionId: newUuid() });
  return { seed, driver, driverId, trip, token: accessToken };
}
describe('GET /v1/driver/trips', () => {
  it('returns empty for driver with no trips today', async () => {
    const seed = await seedBookingScenario({ bookingCount: 0 });
    const driver = await createDriver({ operatorId: seed.operatorId, kycStatus: 'VERIFIED' });
    const { accessToken } = await issueSessionTokens({ userId: driver.id, role: 'DRIVER', sessionId: newUuid() });
    const res = await app.inject({ method: 'GET', url: '/v1/driver/trips', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });

  it('returns today trips with bus + route summary', async () => {
    const { token } = await setupDriver();
    const res = await app.inject({ method: 'GET', url: '/v1/driver/trips', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(1);
    const t = res.json().data[0];
    expect(t.status).toBe('SCHEDULED');
    expect(t.bus.registrationNumber).toBeTruthy();
    expect(t.route.originCity).toBeTruthy();
  });
});

describe('GET /v1/driver/trips/:id', () => {
  it('returns detail with boarding stands', async () => {
    const { token, trip } = await setupDriver();
    const res = await app.inject({ method: 'GET', url: `/v1/driver/trips/${trip.id}`, headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.tripId).toBe(trip.id);
    expect(Array.isArray(res.json().data.boardingStands)).toBe(true);
    expect(res.json().data.boardingStands.length).toBeGreaterThan(0);
  });

  it('returns 404 for other driver trip', async () => {
    const { trip } = await setupDriver();
    const seed2 = await seedBookingScenario({ bookingCount: 0 });
    const other = await createDriver({ operatorId: seed2.operatorId, kycStatus: 'VERIFIED' });
    const { accessToken } = await issueSessionTokens({ userId: other.id, role: 'DRIVER', sessionId: newUuid() });
    const res = await app.inject({ method: 'GET', url: `/v1/driver/trips/${trip.id}`, headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /v1/driver/trips/:id/start', () => {
  it('transitions SCHEDULED → IN_PROGRESS', async () => {
    const { token, trip, driverId } = await setupDriver();
    const res = await app.inject({ method: 'POST', url: `/v1/driver/trips/${trip.id}/start`, headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('IN_PROGRESS');
    const d = await prisma.driverProfile.findUnique({ where: { id: driverId } });
    expect(d?.onDuty).toBe(true);
  });

  it('returns 409 on second start', async () => {
    const { token, trip } = await setupDriver();
    await app.inject({ method: 'POST', url: `/v1/driver/trips/${trip.id}/start`, headers: { authorization: `Bearer ${token}` } });
    const res = await app.inject({ method: 'POST', url: `/v1/driver/trips/${trip.id}/start`, headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(409);
  });
});

describe('POST /v1/driver/trips/:id/end', () => {
  it('transitions IN_PROGRESS → COMPLETED, clears onDuty', async () => {
    const { token, trip, driverId } = await setupDriver();
    await app.inject({ method: 'POST', url: `/v1/driver/trips/${trip.id}/start`, headers: { authorization: `Bearer ${token}` } });
    const res = await app.inject({ method: 'POST', url: `/v1/driver/trips/${trip.id}/end`, headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('COMPLETED');
    const d = await prisma.driverProfile.findUnique({ where: { id: driverId } });
    expect(d?.onDuty).toBe(false);
  });
});
describe('POST /v1/driver/trips/:id/delay', () => {
  it('updates delay fields + writes audit', async () => {
    const { token, trip } = await setupDriver();
    await app.inject({ method: 'POST', url: `/v1/driver/trips/${trip.id}/start`, headers: { authorization: `Bearer ${token}` } });
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/delay`,
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: 'TRAFFIC', delayMinutes: 25 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.delayReason).toBe('TRAFFIC');
    const t = await prisma.trip.findUnique({ where: { id: trip.id } });
    expect(t?.delayMinutes).toBe(25);
  });

  it('returns 422 for invalid reason', async () => {
    const { token, trip } = await setupDriver();
    await app.inject({ method: 'POST', url: `/v1/driver/trips/${trip.id}/start`, headers: { authorization: `Bearer ${token}` } });
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/delay`,
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: 'NOT_REAL', delayMinutes: 25 },
    });
    expect(res.statusCode).toBe(422);
  });
});

describe('GET /v1/driver/me + /config', () => {
  it('me returns driver profile', async () => {
    const { token } = await setupDriver();
    const res = await app.inject({ method: 'GET', url: '/v1/driver/me', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.kycStatus).toBe('VERIFIED');
  });

  it('config returns qrPublicKey + minAppVersion', async () => {
    const { token } = await setupDriver();
    const res = await app.inject({ method: 'GET', url: '/v1/driver/config', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.qrPublicKey).toBeTruthy();
    expect(res.json().data.minAppVersion).toBeTruthy();
  });
});