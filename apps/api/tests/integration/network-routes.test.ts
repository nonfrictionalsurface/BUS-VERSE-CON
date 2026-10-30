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
import { createCity, createStand } from '../helpers/network-factories.js';
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

async function seedTwoCitiesWithStands() {
  const delhi = await createCity({ name: 'Delhi' });
  const lucknow = await createCity({ name: 'Lucknow' });
  const delhiStand1 = await createStand({ cityId: delhi.id, name: 'ISBT Kashmere Gate' });
  const delhiStand2 = await createStand({ cityId: delhi.id, name: 'Anand Vihar' });
  const lucknowStand1 = await createStand({ cityId: lucknow.id, name: 'Alambagh' });
  return { delhi, lucknow, delhiStand1, delhiStand2, lucknowStand1 };
}

describe('GET /v1/public/cities/:id/stands', () => {
  it('returns stands for a city', async () => {
    const { delhi, delhiStand1 } = await seedTwoCitiesWithStands();
    const res = await app.inject({ method: 'GET', url: `/v1/public/cities/${delhi.id}/stands` });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(2);
    expect(res.json().data.some((s: any) => s.id === delhiStand1.id)).toBe(true);
  });
  it('404 for unknown city', async () => {
    const res = await app.inject({ method: 'GET', url: `/v1/public/cities/${newUuid()}/stands` });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /v1/operator/routes', () => {
  it('creates route with stands', async () => {
    const { accessToken } = await loginOperator();
    const { delhi, lucknow, delhiStand1, lucknowStand1 } = await seedTwoCitiesWithStands();
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/routes',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        originCityId: delhi.id,
        destinationCityId: lucknow.id,
        stands: [
          { standId: delhiStand1.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
          { standId: lucknowStand1.id, sequence: 2, distanceFromPrevKm: 500, durationFromPrevMin: 480 },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    const d = res.json().data;
    expect(d.originCity.name).toBe('Delhi');
    expect(d.destinationCity.name).toBe('Lucknow');
    expect(d.approvalStatus).toBe('PENDING');
    expect(d.stands.length).toBe(2);
    expect(d.stands[0].stand.id).toBe(delhiStand1.id);
  });

  it('422 when origin == destination', async () => {
    const { accessToken } = await loginOperator();
    const { delhi, delhiStand1, delhiStand2 } = await seedTwoCitiesWithStands();
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/routes',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        originCityId: delhi.id, destinationCityId: delhi.id,
        stands: [
          { standId: delhiStand1.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
          { standId: delhiStand2.id, sequence: 2, distanceFromPrevKm: 10, durationFromPrevMin: 30 },
        ],
      },
    });
    expect(res.statusCode).toBe(422);
  });

  it('400 when first stand is not in origin city', async () => {
    const { accessToken } = await loginOperator();
    const { delhi, lucknow, lucknowStand1 } = await seedTwoCitiesWithStands();
    const { delhiStand2 } = await seedTwoCitiesWithStands();
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/routes',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        originCityId: delhi.id, destinationCityId: lucknow.id,
        stands: [
          { standId: lucknowStand1.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
          { standId: delhiStand2.id, sequence: 2, distanceFromPrevKm: 500, durationFromPrevMin: 480 },
        ],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('400 when sequences not contiguous', async () => {
    const { accessToken } = await loginOperator();
    const { delhi, lucknow, delhiStand1, lucknowStand1 } = await seedTwoCitiesWithStands();
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/routes',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        originCityId: delhi.id, destinationCityId: lucknow.id,
        stands: [
          { standId: delhiStand1.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
          { standId: lucknowStand1.id, sequence: 3, distanceFromPrevKm: 500, durationFromPrevMin: 480 },
        ],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('422 when fewer than 2 stands', async () => {
    const { accessToken } = await loginOperator();
    const { delhi, lucknow, delhiStand1 } = await seedTwoCitiesWithStands();
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/routes',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        originCityId: delhi.id, destinationCityId: lucknow.id,
        stands: [{ standId: delhiStand1.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 }],
      },
    });
    expect(res.statusCode).toBe(422);
  });
});

describe('GET /v1/operator/routes', () => {
  it('lists operator routes, empty initially', async () => {
    const { accessToken } = await loginOperator();
    const res = await app.inject({
      method: 'GET', url: '/v1/operator/routes',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });
});

describe('DELETE /v1/operator/routes/:id', () => {
  it('404 for other operator route', async () => {
    const { accessToken: t1 } = await loginOperator('op1@test.example');
    await createOperator({ email: 'op2@test.example', password: 'correct horse battery staple' });
    const { accessToken: t2 } = await loginAsOperator(app, 'op2@test.example', 'correct horse battery staple');

    const { delhi, lucknow, delhiStand1, lucknowStand1 } = await seedTwoCitiesWithStands();
    const created = await app.inject({
      method: 'POST', url: '/v1/operator/routes',
      headers: { authorization: `Bearer ${t1}` },
      payload: {
        originCityId: delhi.id, destinationCityId: lucknow.id,
        stands: [
          { standId: delhiStand1.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
          { standId: lucknowStand1.id, sequence: 2, distanceFromPrevKm: 500, durationFromPrevMin: 480 },
        ],
      },
    });
    const routeId = created.json().data.id;
    const del = await app.inject({
      method: 'DELETE', url: `/v1/operator/routes/${routeId}`,
      headers: { authorization: `Bearer ${t2}` },
    });
    expect(del.statusCode).toBe(404);
  });

  it('204 on successful delete', async () => {
    const { accessToken } = await loginOperator();
    const { delhi, lucknow, delhiStand1, lucknowStand1 } = await seedTwoCitiesWithStands();
    const created = await app.inject({
      method: 'POST', url: '/v1/operator/routes',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        originCityId: delhi.id, destinationCityId: lucknow.id,
        stands: [
          { standId: delhiStand1.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
          { standId: lucknowStand1.id, sequence: 2, distanceFromPrevKm: 500, durationFromPrevMin: 480 },
        ],
      },
    });
    const routeId = created.json().data.id;
    const del = await app.inject({
      method: 'DELETE', url: `/v1/operator/routes/${routeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(del.statusCode).toBe(204);
  });
});