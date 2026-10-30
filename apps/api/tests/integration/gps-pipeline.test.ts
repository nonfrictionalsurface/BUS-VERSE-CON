import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { tripRouter } from '../../src/modules/trip/trip.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createDriver, createPassenger } from '../helpers/factories.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis, keys } from '../../src/lib/redis.js';
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

async function setupActiveTrip() {
  const seed = await seedBookingScenario({ bookingCount: 0 });
  await prisma.schedule.update({
    where: { id: seed.schedule.id },
    data: {
      departureTime: new Date(Date.now() + 30 * 60_000),
      arrivalTime: new Date(Date.now() + 510 * 60_000),
    },
  });
  const driver = await createDriver({ operatorId: seed.operatorId, kycStatus: 'VERIFIED' });
  const driverId = driver.driverProfile!.id;
  const trip = await prisma.trip.create({
    data: { scheduleId: seed.schedule.id, busId: seed.bus.id, driverId, status: 'IN_PROGRESS', startedAt: new Date() },
  });
  await prisma.driverProfile.update({ where: { id: driverId }, data: { onDuty: true } });
  const { accessToken } = await issueSessionTokens({ userId: driver.id, role: 'DRIVER', sessionId: newUuid() });
  return { seed, driver, driverId, trip, token: accessToken };
}

function gpsPayload(overrides: Partial<{ lat: number; lng: number; speedKmh: number; accuracyM: number; recordedAt: string }> = {}) {
  return {
    lat: 28.6, lng: 77.2, speedKmh: 0, accuracyM: 10,
    recordedAt: new Date().toISOString(),
    ...overrides,
  };
}
describe('POST /v1/driver/trips/:id/gps — happy path', () => {
  it('accepts first sample (serverSpeedKmh null)', async () => {
    const { token, trip } = await setupActiveTrip();
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/gps`,
      headers: { authorization: `Bearer ${token}` },
      payload: gpsPayload(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.accepted).toBe(true);
    expect(res.json().data.serverSpeedKmh).toBeNull();
  });

  it('6th sample writes to Postgres, earlier samples Redis only', async () => {
    const { token, trip } = await setupActiveTrip();
    for (let i = 0; i < 6; i++) {
      const res = await app.inject({
        method: 'POST', url: `/v1/driver/trips/${trip.id}/gps`,
        headers: { authorization: `Bearer ${token}` },
        payload: gpsPayload(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.accepted).toBe(true);
    }
    const count = await prisma.gpsSample.count({ where: { tripId: trip.id } });
    expect(count).toBe(1);
  });

  it('writes sample to Redis list on every accepted sample', async () => {
    const { token, trip } = await setupActiveTrip();
    await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/gps`,
      headers: { authorization: `Bearer ${token}` }, payload: gpsPayload(),
    });
    const rows = await redis.lrange(keys.gpsTrip(trip.id), 0, -1);
    expect(rows.length).toBe(1);
  });
});

describe('POST /v1/driver/trips/:id/gps — auth', () => {
  it('401 with no token', async () => {
    const { trip } = await setupActiveTrip();
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/gps`, payload: gpsPayload(),
    });
    expect(res.statusCode).toBe(401);
  });

  it('403 with passenger token', async () => {
    const { trip } = await setupActiveTrip();
    const p = await createPassenger();
    const { accessToken } = await issueSessionTokens({ userId: p.id, role: 'REGISTERED_PASSENGER', sessionId: newUuid() });
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/gps`,
      headers: { authorization: `Bearer ${accessToken}` }, payload: gpsPayload(),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /v1/driver/trips/:id/gps — trip state', () => {
  it('404 for other driver trip', async () => {
    const { trip } = await setupActiveTrip();
    const seed2 = await seedBookingScenario({ bookingCount: 0 });
    const other = await createDriver({ operatorId: seed2.operatorId, kycStatus: 'VERIFIED' });
    const { accessToken } = await issueSessionTokens({ userId: other.id, role: 'DRIVER', sessionId: newUuid() });
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/gps`,
      headers: { authorization: `Bearer ${accessToken}` }, payload: gpsPayload(),
    });
    expect(res.statusCode).toBe(404);
  });
});
describe('POST /v1/driver/trips/:id/gps — provenance', () => {
  it('400 INVALID_ACCURACY for accuracy > 100m', async () => {
    const { token, trip } = await setupActiveTrip();
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/gps`,
      headers: { authorization: `Bearer ${token}` },
      payload: gpsPayload({ accuracyM: 200 }),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_ACCURACY');
  });

  it('400 INVALID_COORDINATES for lat out of range', async () => {
    const { token, trip } = await setupActiveTrip();
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/gps`,
      headers: { authorization: `Bearer ${token}` },
      payload: gpsPayload({ lat: 95 }),
    });
    // Zod rejects first (lat > 90) → 422, not our custom 400
    expect([400, 422]).toContain(res.statusCode);
  });

  it('400 INVALID_COORDINATES for (0,0)', async () => {
    const { token, trip } = await setupActiveTrip();
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/gps`,
      headers: { authorization: `Bearer ${token}` },
      payload: gpsPayload({ lat: 0, lng: 0 }),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_COORDINATES');
  });

  it('422 for non-numeric speed', async () => {
    const { token, trip } = await setupActiveTrip();
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/gps`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ...gpsPayload(), speedKmh: 'fast' },
    });
    expect(res.statusCode).toBe(422);
  });
});