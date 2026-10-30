import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { networkRouter } from '../../src/modules/network/network.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createOperator, createPassenger } from '../helpers/factories.js';
import { createCity, createStand, createBus } from '../helpers/network-factories.js';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(networkRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

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

describe('GET /v1/public/cities', () => {
  it('returns empty array when no cities', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/public/cities' });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });

  it('filters by q prefix', async () => {
    await createCity({ name: 'Delhi', state: 'Delhi' });
    await createCity({ name: 'Mumbai', state: 'Maharashtra' });
    const res = await app.inject({ method: 'GET', url: '/v1/public/cities?q=del' });
    expect(res.statusCode).toBe(200);
    const data = res.json().data as Array<{ name: string }>;
    expect(data.length).toBe(1);
    expect(data[0]!.name).toBe('Delhi');
  });

  it('is case-insensitive', async () => {
    await createCity({ name: 'Delhi' });
    const res = await app.inject({ method: 'GET', url: '/v1/public/cities?q=DEL' });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(1);
  });
});

describe('GET /v1/public/schedules/:id', () => {
  async function seedPublishedSchedule() {
    const opUser = await createOperator();
    const operatorId = opUser.operatorUsers[0]!.operatorId;
    const origin = await createCity({ name: 'Delhi' });
    const dest = await createCity({ name: 'Lucknow' });
    const stand1 = await createStand({ cityId: origin.id, name: 'ISBT Kashmere Gate' });
    const stand2 = await createStand({ cityId: dest.id, name: 'Alambagh' });
    const bus = await createBus({ operatorId, capacity: 40 });

    const route = await prisma.route.create({
      data: {
        id: newUuid(),
        operatorId,
        originCityId: origin.id,
        destinationCityId: dest.id,
        approvalStatus: 'APPROVED',
      },
    });
    await prisma.routeStand.createMany({
      data: [
        { id: newUuid(), routeId: route.id, standId: stand1.id, sequence: 1,
          distanceFromPrevKm: 0, durationFromPrevMin: 0 },
        { id: newUuid(), routeId: route.id, standId: stand2.id, sequence: 2,
          distanceFromPrevKm: 500, durationFromPrevMin: 480 },
      ],
    });

    const schedule = await prisma.schedule.create({
      data: {
        id: newUuid(),
        operatorId,
        busId: bus.id,
        routeId: route.id,
        departureTime: new Date('2026-11-01T08:00:00.000Z'),
        arrivalTime: new Date('2026-11-01T16:00:00.000Z'),
        fareAmountPaise: 45000n,
        fareCurrency: 'INR',
        status: 'PUBLISHED',
      },
    });
    return { schedule, bus, route };
  }

  it('returns detail for published schedule', async () => {
    const { schedule } = await seedPublishedSchedule();
    const res = await app.inject({
      method: 'GET',
      url: `/v1/public/schedules/${schedule.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json().data;
    expect(body.scheduleId).toBe(schedule.id);
    expect(body.status).toBe('PUBLISHED');
    expect(body.bus.busType).toBe('AC_SEATER');
    expect(body.route.originCity.name).toBe('Delhi');
    expect(body.route.destinationCity.name).toBe('Lucknow');
    expect(body.route.stands.length).toBe(2);
    expect(body.availableSeats).toBe(40);
    expect(body.durationMinutes).toBe(480);
    expect(body.fare).toEqual({ amountPaise: 45000, currency: 'INR' });
  });

  it('returns 404 for unpublished schedule', async () => {
    const { schedule } = await seedPublishedSchedule();
    await prisma.schedule.update({ where: { id: schedule.id }, data: { status: 'DRAFT' } });
    const res = await app.inject({
      method: 'GET',
      url: `/v1/public/schedules/${schedule.id}`,
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/public/schedules/${newUuid()}`,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /v1/public/search', () => {
  async function seedRoutes() {
    const opUser = await createOperator();
    const operatorId = opUser.operatorUsers[0]!.operatorId;
    const origin = await createCity({ name: 'Delhi' });
    const dest = await createCity({ name: 'Lucknow' });
    const bus = await createBus({ operatorId, capacity: 40 });
    const route = await prisma.route.create({
      data: { id: newUuid(), operatorId, originCityId: origin.id, destinationCityId: dest.id, approvalStatus: 'APPROVED' },
    });
    const sched = await prisma.schedule.create({
      data: {
        id: newUuid(),
        operatorId,
        busId: bus.id,
        routeId: route.id,
        departureTime: new Date('2026-11-01T08:00:00.000Z'),
        arrivalTime: new Date('2026-11-01T16:00:00.000Z'),
        fareAmountPaise: 45000n,
        fareCurrency: 'INR',
        status: 'PUBLISHED',
      },
    });
    return { origin, dest, sched };
  }

  it('returns 422 without required params', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/public/search' });
    expect(res.statusCode).toBe(422);
  });

  it('returns matching schedules for route + date', async () => {
    const { origin, dest, sched } = await seedRoutes();
    const res = await app.inject({
      method: 'GET',
      url: `/v1/public/search?originCityId=${origin.id}&destinationCityId=${dest.id}&date=2026-11-01`,
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data as Array<{ scheduleId: string }>;
    expect(data.length).toBe(1);
    expect(data[0]!.scheduleId).toBe(sched.id);
  });

  it('excludes non-published schedules', async () => {
    const { origin, dest, sched } = await seedRoutes();
    await prisma.schedule.update({ where: { id: sched.id }, data: { status: 'DRAFT' } });
    const res = await app.inject({
      method: 'GET',
      url: `/v1/public/search?originCityId=${origin.id}&destinationCityId=${dest.id}&date=2026-11-01`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────
// R28 — availableSeats must subtract active seat locks
// ────────────────────────────────────────────────────────────────

async function setupR28() {
  const opUser = await createOperator({ email: `r28-${newUuid().slice(0, 6)}@test.example` });
  const operatorId = opUser.operatorUsers[0]!.operatorId;
  const delhi = await createCity({ name: `R28Delhi-${newUuid().slice(0, 4)}` });
  const lucknow = await createCity({ name: `R28Lucknow-${newUuid().slice(0, 4)}` });
  const s1 = await createStand({ cityId: delhi.id, name: 'S1', type: 'BUS_STAND' });
  const s2 = await createStand({ cityId: lucknow.id, name: 'S2', type: 'DROP_POINT' });
  const bus = await createBus({ operatorId, capacity: 20, busType: 'AC_SEATER', approvalStatus: 'APPROVED' });
  const layout = await prisma.seatLayout.create({ data: { busId: bus.id, rowsCount: 2, columnsCount: 10, aisleMapJson: { _v: 1, aisle_cells: [] } } });
  const seats: Array<{ id: string }> = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 1; c <= 10; c++) {
      const row = String.fromCharCode(65 + r);
      seats.push(await prisma.seat.create({ data: { layoutId: layout.id, seatRow: row, seatColumn: c, seatLabel: `${row}${c}`, seatType: 'SEATER' } }));
    }
  }
  const route = await prisma.route.create({
    data: {
      operatorId, originCityId: delhi.id, destinationCityId: lucknow.id, approvalStatus: 'APPROVED',
      stands: { create: [
        { standId: s1.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
        { standId: s2.id, sequence: 2, distanceFromPrevKm: 500, durationFromPrevMin: 480 },
      ] },
    },
  });
  const tomorrowIst = new Date(Date.now() + 24 * 3600 * 1000 + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const schedule = await prisma.schedule.create({
    data: {
      operatorId, busId: bus.id, routeId: route.id,
      departureTime: new Date(`${tomorrowIst}T08:00:00.000+05:30`),
      arrivalTime: new Date(`${tomorrowIst}T16:00:00.000+05:30`),
      fareAmountPaise: 45000n, fareCurrency: 'INR', status: 'PUBLISHED',
    },
  });
  return { delhi, lucknow, seats, schedule, tomorrowIst };
}

describe('R28 — availableSeats subtracts active seat locks', () => {
  it('searchPublic: availableSeats = capacity - active locks', async () => {
    const ctx = await setupR28();
    const url = `/v1/public/search?originCityId=${ctx.delhi.id}&destinationCityId=${ctx.lucknow.id}&date=${ctx.tomorrowIst}`;

    const r0 = await app.inject({ method: 'GET', url });
    expect(r0.statusCode).toBe(200);
    const s0 = (r0.json().data as Array<{ scheduleId: string; availableSeats: number }>).find((x) => x.scheduleId === ctx.schedule.id);
    expect(s0?.availableSeats).toBe(20);

    const passenger = await createPassenger();
    await prisma.seatLock.create({
      data: { scheduleId: ctx.schedule.id, seatId: ctx.seats[0]!.id, userId: passenger.id, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    });

    const r1 = await app.inject({ method: 'GET', url });
    const s1 = (r1.json().data as Array<{ scheduleId: string; availableSeats: number }>).find((x) => x.scheduleId === ctx.schedule.id);
    expect(s1?.availableSeats).toBe(19);
  });

  it('searchPublic: expired lock does not reduce availableSeats', async () => {
    const ctx = await setupR28();
    const passenger = await createPassenger();
    await prisma.seatLock.create({
      data: { scheduleId: ctx.schedule.id, seatId: ctx.seats[0]!.id, userId: passenger.id, expiresAt: new Date(Date.now() - 60 * 1000) },
    });
    const r = await app.inject({ method: 'GET', url: `/v1/public/search?originCityId=${ctx.delhi.id}&destinationCityId=${ctx.lucknow.id}&date=${ctx.tomorrowIst}` });
    const s = (r.json().data as Array<{ scheduleId: string; availableSeats: number }>).find((x) => x.scheduleId === ctx.schedule.id);
    expect(s?.availableSeats).toBe(20);
  });

  it('getScheduleDetail: availableSeats = capacity - active locks', async () => {
    const ctx = await setupR28();
    const passenger = await createPassenger();
    await prisma.seatLock.create({
      data: { scheduleId: ctx.schedule.id, seatId: ctx.seats[0]!.id, userId: passenger.id, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
    });
    const r = await app.inject({ method: 'GET', url: `/v1/public/schedules/${ctx.schedule.id}` });
    expect(r.statusCode).toBe(200);
    expect((r.json().data as { availableSeats: number }).availableSeats).toBe(19);
  });
});