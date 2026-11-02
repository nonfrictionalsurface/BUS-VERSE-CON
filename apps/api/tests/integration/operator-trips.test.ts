import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';
import { issueSessionTokens } from '../../src/modules/identity/jwt.service.js';
import { computePhoneHash } from '../../src/lib/phone.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { createDriver } from '../helpers/factories.js';

let app: FastifyInstance;

async function buildServer(): Promise<void> {
  app = Fastify({ logger: false });
  await app.removeContentTypeParser('application/json');
  await app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    (req as { rawBody?: Buffer }).rawBody = body as Buffer;
    try { done(null, JSON.parse((body as Buffer).toString('utf8'))); }
    catch (e) { done(e as Error, undefined); }
  });
  await app.setReplySerializer((payload) => {
    if (typeof payload === 'string') return payload;
    return JSON.stringify(payload, (_, v) => {
      if (typeof v === 'bigint') return Number(v);
      if (v && typeof v === 'object' && typeof (v as { toNumber?: unknown }).toNumber === 'function') {
        return (v as { toNumber: () => number }).toNumber();
      }
      return v;
    });
  });
  const { registerMiddleware } = await import('../../src/middleware/index.js');
  await registerMiddleware(app);
  const { networkRouter } = await import('../../src/modules/network/network.router.js');
  await app.register(networkRouter, { prefix: '/v1' });
  await app.listen({ port: 0, host: '127.0.0.1' });
}

beforeEach(async () => {
  await resetIdentityTables();
  if (!app) await buildServer();
});
afterAll(async () => { try { await app?.close(); } catch { /* best-effort */ } });

async function makeOperatorUser(operatorId: string) {
  const suffix = Date.now().toString().slice(-8) + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const phone = '+9199' + suffix.slice(0, 8);
  const user = await prisma.user.create({
    data: { phone, phoneHash: computePhoneHash(phone), email: 'op-' + suffix + '@test.local' },
  });
  await prisma.operatorUser.create({
    data: { userId: user.id, operatorId, role: 'OWNER', passwordHash: 'x' },
  });
  const token = (await issueSessionTokens({
    userId: user.id, role: 'OPERATOR_OWNER', sessionId: newUuid(),
  })).accessToken;
  return { userId: user.id, token };
}

async function setupScenario(opts: { scheduleStatus?: 'DRAFT' | 'PUBLISHED'; pastDeparture?: boolean; kycStatus?: 'INVITED' | 'VERIFIED' | 'ACTIVE' | 'BLOCKED' } = {}) {
  const seed = await seedBookingScenario({ bookingCount: 0 });

  const orig = await prisma.schedule.findUnique({
    where: { id: seed.schedule.id },
    select: { departureTime: true, arrivalTime: true, routeId: true },
  });
  if (!orig) throw new Error('schedule not found');
  const durMs = orig.arrivalTime.getTime() - orig.departureTime.getTime();
  const newDep = opts.pastDeparture
    ? new Date(Date.now() - 2 * 60 * 60 * 1000)
    : new Date(Date.now() + 2 * 60 * 60 * 1000);
  await prisma.schedule.update({
    where: { id: seed.schedule.id },
    data: {
      status: opts.scheduleStatus ?? 'PUBLISHED',
      departureTime: newDep,
      arrivalTime: new Date(newDep.getTime() + durMs),
    },
  });
  await prisma.bus.update({ where: { id: seed.bus.id }, data: { approvalStatus: 'APPROVED' } });
  await prisma.route.update({ where: { id: orig.routeId }, data: { approvalStatus: 'APPROVED' } });

  const op = await makeOperatorUser(seed.operatorId);
  const driver = await createDriver({
    operatorId: seed.operatorId,
    kycStatus: opts.kycStatus ?? 'VERIFIED',
  });
  return { seed, opToken: op.token, opUserId: op.userId, driver };
}

describe('POST /v1/operator/trips', () => {
  it('happy path — creates SCHEDULED trip', async () => {
    const { seed, opToken, driver } = await setupScenario();
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/trips',
      headers: { authorization: 'Bearer ' + opToken },
      payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id },
    });
    expect(res.statusCode, 'body: ' + res.body).toBe(201);
    const data = res.json().data;
    expect(data.status).toBe('SCHEDULED');
    expect(data.scheduleId).toBe(seed.schedule.id);
    expect(data.driverId).toBe(driver.driverProfile.id);
    expect(data.busId).toBe(seed.bus.id);
    expect(data.driverPhone).toBeTruthy();
  });

  it('draft schedule → 400 INVALID_SCHEDULE', async () => {
    const { seed, opToken, driver } = await setupScenario({ scheduleStatus: 'DRAFT' });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/trips',
      headers: { authorization: 'Bearer ' + opToken },
      payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_SCHEDULE');
  });

  it('past departure → 400 INVALID_SCHEDULE', async () => {
    const { seed, opToken, driver } = await setupScenario({ pastDeparture: true });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/trips',
      headers: { authorization: 'Bearer ' + opToken },
      payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_SCHEDULE');
  });

  it('duplicate assignment → 400 INVALID_TRANSITION', async () => {
    const { seed, opToken, driver } = await setupScenario();
    await app.inject({
      method: 'POST', url: '/v1/operator/trips',
      headers: { authorization: 'Bearer ' + opToken },
      payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id },
    });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/trips',
      headers: { authorization: 'Bearer ' + opToken },
      payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_TRANSITION');
  });

  it('driver from other operator → 404', async () => {
    const { seed, opToken } = await setupScenario();
    const other = await seedBookingScenario({ bookingCount: 0 });
    const otherDriver = await createDriver({ operatorId: other.operatorId, kycStatus: 'VERIFIED' });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/trips',
      headers: { authorization: 'Bearer ' + opToken },
      payload: { scheduleId: seed.schedule.id, driverId: otherDriver.driverProfile.id },
    });
    expect(res.statusCode).toBe(404);
  });

  it('unverified driver → 403 DRIVER_NOT_VERIFIED', async () => {
    const { seed, opToken, driver } = await setupScenario({ kycStatus: 'INVITED' });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/trips',
      headers: { authorization: 'Bearer ' + opToken },
      payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('DRIVER_NOT_VERIFIED');
  });
});
describe('GET /v1/operator/trips', () => {
  it('lists assigned trips', async () => {
    const { seed, opToken, driver } = await setupScenario();
    await app.inject({ method: 'POST', url: '/v1/operator/trips', headers: { authorization: 'Bearer ' + opToken }, payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id } });
    const res = await app.inject({ method: 'GET', url: '/v1/operator/trips', headers: { authorization: 'Bearer ' + opToken } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(1);
  });

  it('filters by driverId', async () => {
    const { seed, opToken, driver } = await setupScenario();
    await app.inject({ method: 'POST', url: '/v1/operator/trips', headers: { authorization: 'Bearer ' + opToken }, payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id } });
    const other = await createDriver({ operatorId: seed.operatorId, kycStatus: 'VERIFIED' });
    const res = await app.inject({ method: 'GET', url: '/v1/operator/trips?driverId=' + other.driverProfile.id, headers: { authorization: 'Bearer ' + opToken } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(0);
  });
});
describe('GET /v1/operator/trips/:id', () => {
  it('returns trip detail with driver info', async () => {
    const { seed, opToken, driver } = await setupScenario();
    const create = await app.inject({ method: 'POST', url: '/v1/operator/trips', headers: { authorization: 'Bearer ' + opToken }, payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id } });
    const tripId = create.json().data.tripId;
    const res = await app.inject({ method: 'GET', url: '/v1/operator/trips/' + tripId, headers: { authorization: 'Bearer ' + opToken } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.tripId).toBe(tripId);
  });

  it('unknown id returns 404', async () => {
    const { opToken } = await setupScenario();
    const res = await app.inject({ method: 'GET', url: '/v1/operator/trips/' + newUuid(), headers: { authorization: 'Bearer ' + opToken } });
    expect(res.statusCode).toBe(404);
  });
});
describe('PATCH reassign', () => {
  it('reassigns driver on SCHEDULED trip', async () => {
    const { seed, opToken, driver } = await setupScenario();
    const create = await app.inject({ method: 'POST', url: '/v1/operator/trips', headers: { authorization: 'Bearer ' + opToken }, payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id } });
    const tripId = create.json().data.tripId;
    const driver2 = await createDriver({ operatorId: seed.operatorId, kycStatus: 'VERIFIED' });
    const res = await app.inject({ method: 'PATCH', url: '/v1/operator/trips/' + tripId, headers: { authorization: 'Bearer ' + opToken }, payload: { driverId: driver2.driverProfile.id } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.driverId).toBe(driver2.driverProfile.id);
  });

  it('reassign on IN_PROGRESS returns 400', async () => {
    const { seed, opToken, driver } = await setupScenario();
    const create = await app.inject({ method: 'POST', url: '/v1/operator/trips', headers: { authorization: 'Bearer ' + opToken }, payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id } });
    const tripId = create.json().data.tripId;
    await prisma.trip.update({ where: { id: tripId }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
    const driver2 = await createDriver({ operatorId: seed.operatorId, kycStatus: 'VERIFIED' });
    const res = await app.inject({ method: 'PATCH', url: '/v1/operator/trips/' + tripId, headers: { authorization: 'Bearer ' + opToken }, payload: { driverId: driver2.driverProfile.id } });
    expect(res.statusCode).toBe(400);
  });
});
describe('DELETE unassign', () => {
  it('soft-deletes SCHEDULED trip', async () => {
    const { seed, opToken, driver } = await setupScenario();
    const create = await app.inject({ method: 'POST', url: '/v1/operator/trips', headers: { authorization: 'Bearer ' + opToken }, payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id } });
    const tripId = create.json().data.tripId;
    const res = await app.inject({ method: 'DELETE', url: '/v1/operator/trips/' + tripId, headers: { authorization: 'Bearer ' + opToken } });
    expect(res.statusCode).toBe(204);
    const row = await prisma.trip.findUnique({ where: { id: tripId } });
    expect(row?.deletedAt).not.toBeNull();
  });

  it('unassign on IN_PROGRESS returns 400', async () => {
    const { seed, opToken, driver } = await setupScenario();
    const create = await app.inject({ method: 'POST', url: '/v1/operator/trips', headers: { authorization: 'Bearer ' + opToken }, payload: { scheduleId: seed.schedule.id, driverId: driver.driverProfile.id } });
    const tripId = create.json().data.tripId;
    await prisma.trip.update({ where: { id: tripId }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
    const res = await app.inject({ method: 'DELETE', url: '/v1/operator/trips/' + tripId, headers: { authorization: 'Bearer ' + opToken } });
    expect(res.statusCode).toBe(400);
  });
});