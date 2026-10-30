import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { bookingRouter } from '../../src/modules/booking/booking.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createDriver, createPassenger } from '../helpers/factories.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { loginAsPassenger } from '../helpers/auth.js';
import { prisma } from '../../src/lib/prisma.js';
import { redis, keys } from '../../src/lib/redis.js';
import { issueSessionTokens } from '../../src/modules/identity/jwt.service.js';
import { newUuid } from '../../src/lib/ids.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(bookingRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetIdentityTables(); });

async function setupTrackedTrip() {
  const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 1, status: 'CONFIRMED' });
  const passengerUserId = seed.bookings[0]!.userId;
  const driver = await createDriver({ operatorId: seed.operatorId, kycStatus: 'VERIFIED' });
  const trip = await prisma.trip.create({
    data: {
      scheduleId: seed.schedule.id,
      busId: seed.bus.id,
      driverId: driver.driverProfile!.id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });
  const passengerToken = await loginAsPassenger(passengerUserId);
  return { seed, trip, passengerUserId, passengerToken };
}

async function seedRedisSamples(tripId: string, samples: Array<{ lat: number; lng: number; ageSec: number }>): Promise<void> {
  const key = keys.gpsTrip(tripId);
  await redis.del(key);
  for (const s of samples) {
    const recordedAt = new Date(Date.now() - s.ageSec * 1000).toISOString();
    const receivedAt = new Date(Date.now() - s.ageSec * 1000 + 100).toISOString();
    const normalized = {
      lat: s.lat, lng: s.lng,
      serverSpeedKmh: 0, clientSpeedKmh: 0, accuracyM: 10,
      recordedAt, receivedAt, timestampDrift: false,
    };
    await redis.lpush(key, JSON.stringify(normalized));
  }
  await redis.expire(key, 6 * 3600);
}
describe('GET /v1/passenger/trips/:id/live', () => {
  it('returns 200 with null position when no GPS samples yet', async () => {
    const { trip, passengerToken } = await setupTrackedTrip();
    const res = await app.inject({
      method: 'GET', url: `/v1/passenger/trips/${trip.id}/live`,
      headers: { authorization: `Bearer ${passengerToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.currentPosition).toBeNull();
    expect(res.json().data.isStale).toBe(true);
    expect(res.json().data.eta).toEqual([]);
  });

  it('returns 200 with currentPosition + eta when samples exist', async () => {
    const { trip, passengerToken } = await setupTrackedTrip();
    await seedRedisSamples(trip.id, [
      { lat: 28.60, lng: 77.20, ageSec: 10 },
      { lat: 28.61, lng: 77.20, ageSec: 5 },
    ]);
    const res = await app.inject({
      method: 'GET', url: `/v1/passenger/trips/${trip.id}/live`,
      headers: { authorization: `Bearer ${passengerToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.currentPosition).not.toBeNull();
    expect(typeof res.json().data.currentPosition.lat).toBe('number');
    expect(Array.isArray(res.json().data.eta)).toBe(true);
  });

  it('marks isStale=true when last sample older than 30s', async () => {
    const { trip, passengerToken } = await setupTrackedTrip();
    await seedRedisSamples(trip.id, [{ lat: 28.60, lng: 77.20, ageSec: 60 }]);
    const res = await app.inject({
      method: 'GET', url: `/v1/passenger/trips/${trip.id}/live`,
      headers: { authorization: `Bearer ${passengerToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.isStale).toBe(true);
    expect(res.json().data.currentPosition).not.toBeNull();
  });

  it('returns 404 for passenger with no booking on this trip', async () => {
    const { trip } = await setupTrackedTrip();
    const other = await createPassenger();
    const token = await loginAsPassenger(other.id);
    const res = await app.inject({
      method: 'GET', url: `/v1/passenger/trips/${trip.id}/live`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /v1/passenger/trips/:id/map', () => {
  it('returns route stands + current position', async () => {
    const { trip, passengerToken } = await setupTrackedTrip();
    await seedRedisSamples(trip.id, [{ lat: 28.60, lng: 77.20, ageSec: 5 }]);
    const res = await app.inject({
      method: 'GET', url: `/v1/passenger/trips/${trip.id}/map`,
      headers: { authorization: `Bearer ${passengerToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.route.stands.length).toBeGreaterThan(0);
    expect(res.json().data.currentPosition).not.toBeNull();
  });

  it('returns 200 with null currentPosition when no samples', async () => {
    const { trip, passengerToken } = await setupTrackedTrip();
    const res = await app.inject({
      method: 'GET', url: `/v1/passenger/trips/${trip.id}/map`,
      headers: { authorization: `Bearer ${passengerToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.currentPosition).toBeNull();
  });
});