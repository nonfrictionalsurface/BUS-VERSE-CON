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

describe('GET /v1/operator/drivers', () => {
  it('returns empty initially', async () => {
    const { accessToken } = await loginOperator();
    const res = await app.inject({ method: 'GET', url: '/v1/operator/drivers', headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });
  it('401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/operator/drivers' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /v1/operator/drivers/invite', () => {
  it('creates new user + driver profile with INVITED status', async () => {
    const { accessToken } = await loginOperator();
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/drivers/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { phone: '+919876543001', licenseNumber: 'DL-0420110001', name: 'Rajesh Kumar' },
    });
    expect(res.statusCode).toBe(201);
    const d = res.json().data;
    expect(d.name).toBe('Rajesh Kumar');
    expect(d.phone).toBe('+919876543001');
    expect(d.kycStatus).toBe('INVITED');
    expect(d.onDuty).toBe(false);
  });
  it('rejects duplicate license across operators → 409', async () => {
    const { accessToken: t1 } = await loginOperator('op1@test.example');
    await createOperator({ email: 'op2@test.example', password: 'correct horse battery staple' });
    const { accessToken: t2 } = await loginAsOperator(app, 'op2@test.example', 'correct horse battery staple');
    await app.inject({
      method: 'POST', url: '/v1/operator/drivers/invite',
      headers: { authorization: `Bearer ${t1}` },
      payload: { phone: '+919876543010', licenseNumber: 'KA-DUP-0001', name: 'Driver A' },
    });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/drivers/invite',
      headers: { authorization: `Bearer ${t2}` },
      payload: { phone: '+919876543011', licenseNumber: 'KA-DUP-0001', name: 'Driver B' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('LICENSE_ALREADY_REGISTERED');
  });
  it('rejects same-operator duplicate phone → 400', async () => {
    const { accessToken } = await loginOperator();
    await app.inject({
      method: 'POST', url: '/v1/operator/drivers/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { phone: '+919876543020', licenseNumber: 'TN-DUP-0001', name: 'Driver X' },
    });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/drivers/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { phone: '+919876543020', licenseNumber: 'TN-DUP-0002', name: 'Driver X Again' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /v1/operator/drivers/:id', () => {
  it('returns full PII for own driver', async () => {
    const { accessToken } = await loginOperator();
    const inv = await app.inject({
      method: 'POST', url: '/v1/operator/drivers/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { phone: '+919876543030', licenseNumber: 'MH-GET-0001', name: 'Driver Y' },
    });
    const driverId = inv.json().data.id;
    const res = await app.inject({ method: 'GET', url: `/v1/operator/drivers/${driverId}`, headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.phone).toBe('+919876543030');
  });
  it('404 for another operator\'s driver', async () => {
    const { accessToken: t1 } = await loginOperator('op1@test.example');
    await createOperator({ email: 'op2@test.example', password: 'correct horse battery staple' });
    const { accessToken: t2 } = await loginAsOperator(app, 'op2@test.example', 'correct horse battery staple');
    const inv = await app.inject({
      method: 'POST', url: '/v1/operator/drivers/invite',
      headers: { authorization: `Bearer ${t1}` },
      payload: { phone: '+919876543040', licenseNumber: 'WB-XT-0001', name: 'Driver Z' },
    });
    const driverId = inv.json().data.id;
    const res = await app.inject({ method: 'GET', url: `/v1/operator/drivers/${driverId}`, headers: { authorization: `Bearer ${t2}` } });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /v1/operator/drivers/:id', () => {
  it('soft-deletes driver', async () => {
    const { accessToken } = await loginOperator();
    const inv = await app.inject({
      method: 'POST', url: '/v1/operator/drivers/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { phone: '+919876543050', licenseNumber: 'GJ-DEL-0001', name: 'Driver D' },
    });
    const driverId = inv.json().data.id;
    const del = await app.inject({ method: 'DELETE', url: `/v1/operator/drivers/${driverId}`, headers: { authorization: `Bearer ${accessToken}` } });
    expect(del.statusCode).toBe(204);
    const list = await app.inject({ method: 'GET', url: '/v1/operator/drivers', headers: { authorization: `Bearer ${accessToken}` } });
    expect(list.json().data).toEqual([]);
  });
  it('409 DRIVER_ON_DUTY if onDuty', async () => {
    const { accessToken } = await loginOperator();
    const inv = await app.inject({
      method: 'POST', url: '/v1/operator/drivers/invite',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { phone: '+919876543060', licenseNumber: 'AP-OND-0001', name: 'Driver D' },
    });
    const driverId = inv.json().data.id;
    await prisma.driverProfile.update({ where: { id: driverId }, data: { onDuty: true } });
    const res = await app.inject({ method: 'DELETE', url: `/v1/operator/drivers/${driverId}`, headers: { authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('DRIVER_ON_DUTY');
  });
});