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
import { createCity, createStand, createBus, createRoute } from '../helpers/network-factories.js';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';

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
  await prisma.schedule.deleteMany({});
  await prisma.routeStand.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.seat.deleteMany({});
  await prisma.seatLayout.deleteMany({});
  await prisma.bus.deleteMany({});
  await prisma.stand.deleteMany({});
  await prisma.city.deleteMany({});
});

async function loginOperator(email = 'op@test.example') {
  await createOperator({ email, password: 'correct horse battery staple' });
  return loginAsOperator(app, email, 'correct horse battery staple');
}

async function seedOperatorWithBusRoute(operatorId: string, opts?: { busApproved?: boolean; routeApproved?: boolean }) {
  const delhi = await createCity({ name: 'Delhi' });
  const lucknow = await createCity({ name: 'Lucknow' });
  const s1 = await createStand({ cityId: delhi.id });
  const s2 = await createStand({ cityId: lucknow.id });
  const bus = await createBus({ operatorId, capacity: 40, approvalStatus: opts?.busApproved ? 'APPROVED' : 'PENDING' });
  const route = await createRoute({
    operatorId, originCityId: delhi.id, destinationCityId: lucknow.id,
    stands: [
      { standId: s1.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
      { standId: s2.id, sequence: 2, distanceFromPrevKm: 500, durationFromPrevMin: 480 },
    ],
    approvalStatus: opts?.routeApproved ? 'APPROVED' : 'PENDING',
  });
  return { bus, route };
}

describe('POST /v1/operator/schedules', () => {
  it('creates DRAFT schedule', async () => {
    const { accessToken } = await loginOperator();
    const opUser = await prisma.operatorUser.findFirst({ where: { user: { email: 'op@test.example' } } });
    const { bus, route } = await seedOperatorWithBusRoute(opUser!.operatorId);
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T08:00:00.000Z',
        arrivalTime: '2026-11-01T16:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    expect(res.statusCode).toBe(201);
    const d = res.json().data;
    expect(d.status).toBe('DRAFT');
    expect(d.fare).toEqual({ amountPaise: 45000, currency: 'INR' });
    expect(d.bus.registrationNumber).toBe(bus.registrationNumber);
    expect(d.route.originCity.name).toBe('Delhi');
  });

  it('400 when arrival <= departure', async () => {
    const { accessToken } = await loginOperator();
    const opUser = await prisma.operatorUser.findFirst({ where: { user: { email: 'op@test.example' } } });
    const { bus, route } = await seedOperatorWithBusRoute(opUser!.operatorId);
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T16:00:00.000Z',
        arrivalTime: '2026-11-01T08:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    expect(res.statusCode).toBe(422);
  });

  it('404 when bus belongs to another operator', async () => {
    const { accessToken } = await loginOperator('op1@test.example');
    await createOperator({ email: 'op2@test.example', password: 'correct horse battery staple' });
    const op2 = await prisma.operatorUser.findFirst({ where: { user: { email: 'op2@test.example' } } });
    const { bus, route } = await seedOperatorWithBusRoute(op2!.operatorId);
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T08:00:00.000Z',
        arrivalTime: '2026-11-01T16:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /v1/operator/schedules', () => {
  it('lists own schedules only', async () => {
    const { accessToken } = await loginOperator();
    const opUser = await prisma.operatorUser.findFirst({ where: { user: { email: 'op@test.example' } } });
    const { bus, route } = await seedOperatorWithBusRoute(opUser!.operatorId);
    await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T08:00:00.000Z',
        arrivalTime: '2026-11-01T16:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    const res = await app.inject({
      method: 'GET', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(1);
  });
});

describe('PATCH /v1/operator/schedules/:id', () => {
  it('updates DRAFT schedule fare', async () => {
    const { accessToken } = await loginOperator();
    const opUser = await prisma.operatorUser.findFirst({ where: { user: { email: 'op@test.example' } } });
    const { bus, route } = await seedOperatorWithBusRoute(opUser!.operatorId);
    const created = await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T08:00:00.000Z',
        arrivalTime: '2026-11-01T16:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    const scheduleId = created.json().data.id;
    const res = await app.inject({
      method: 'PATCH', url: `/v1/operator/schedules/${scheduleId}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { fareAmountPaise: 55000 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.fare.amountPaise).toBe(55000);
  });
});

describe('POST /v1/operator/schedules/:id/publish', () => {
  it('publishes DRAFT when bus+route approved and no conflict', async () => {
    const { accessToken } = await loginOperator();
    const opUser = await prisma.operatorUser.findFirst({ where: { user: { email: 'op@test.example' } } });
    const { bus, route } = await seedOperatorWithBusRoute(opUser!.operatorId, { busApproved: true, routeApproved: true });
    const created = await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T08:00:00.000Z',
        arrivalTime: '2026-11-01T16:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    const scheduleId = created.json().data.id;
    const res = await app.inject({
      method: 'POST', url: `/v1/operator/schedules/${scheduleId}/publish`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('PUBLISHED');
  });

  it('400 when bus not APPROVED', async () => {
    const { accessToken } = await loginOperator();
    const opUser = await prisma.operatorUser.findFirst({ where: { user: { email: 'op@test.example' } } });
    const { bus, route } = await seedOperatorWithBusRoute(opUser!.operatorId, { busApproved: false, routeApproved: true });
    const created = await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T08:00:00.000Z',
        arrivalTime: '2026-11-01T16:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    const scheduleId = created.json().data.id;
    const res = await app.inject({
      method: 'POST', url: `/v1/operator/schedules/${scheduleId}/publish`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('400 when route not APPROVED', async () => {
    const { accessToken } = await loginOperator();
    const opUser = await prisma.operatorUser.findFirst({ where: { user: { email: 'op@test.example' } } });
    const { bus, route } = await seedOperatorWithBusRoute(opUser!.operatorId, { busApproved: true, routeApproved: false });
    const created = await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T08:00:00.000Z',
        arrivalTime: '2026-11-01T16:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    const scheduleId = created.json().data.id;
    const res = await app.inject({
      method: 'POST', url: `/v1/operator/schedules/${scheduleId}/publish`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('409 when another PUBLISHED schedule for same bus overlaps', async () => {
    const { accessToken } = await loginOperator();
    const opUser = await prisma.operatorUser.findFirst({ where: { user: { email: 'op@test.example' } } });
    const { bus, route } = await seedOperatorWithBusRoute(opUser!.operatorId, { busApproved: true, routeApproved: true });

    // Publish first schedule
    const first = await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T08:00:00.000Z',
        arrivalTime: '2026-11-01T16:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    await app.inject({
      method: 'POST', url: `/v1/operator/schedules/${first.json().data.id}/publish`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Try to publish overlapping
    const second = await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T10:00:00.000Z',
        arrivalTime: '2026-11-01T18:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    const res = await app.inject({
      method: 'POST', url: `/v1/operator/schedules/${second.json().data.id}/publish`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.details.conflictingScheduleId).toBe(first.json().data.id);
  });

  it('allows non-overlapping schedules for same bus', async () => {
    const { accessToken } = await loginOperator();
    const opUser = await prisma.operatorUser.findFirst({ where: { user: { email: 'op@test.example' } } });
    const { bus, route } = await seedOperatorWithBusRoute(opUser!.operatorId, { busApproved: true, routeApproved: true });

    const first = await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T08:00:00.000Z',
        arrivalTime: '2026-11-01T16:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    await app.inject({
      method: 'POST', url: `/v1/operator/schedules/${first.json().data.id}/publish`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const second = await app.inject({
      method: 'POST', url: '/v1/operator/schedules',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        busId: bus.id, routeId: route.id,
        departureTime: '2026-11-01T17:00:00.000Z',
        arrivalTime: '2026-11-02T01:00:00.000Z',
        fareAmountPaise: 45000,
      },
    });
    const res = await app.inject({
      method: 'POST', url: `/v1/operator/schedules/${second.json().data.id}/publish`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
  });
});