import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { identityRouter } from '../../src/modules/identity/identity.router.js';
import { networkRouter } from '../../src/modules/network/network.router.js';
import { adminRouter } from '../../src/modules/admin/admin.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createAdmin, createOperator } from '../helpers/factories.js';
import { createCity, createStand, createBus, createRoute } from '../helpers/network-factories.js';
import { loginAsAdmin, loginAsOperator } from '../helpers/auth.js';
import { prisma } from '../../src/lib/prisma.js';

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

async function createPendingOperator(email?: string) {
  const op = await createOperator({ email: email ?? `op-${Date.now()}@test.example` });
  const operatorId = op.operatorUsers[0]!.operatorId;
  await prisma.operator.update({ where: { id: operatorId }, data: { status: 'PENDING_REVIEW' } });
  return { operatorId, opUser: op };
}

describe('admin auth gates', () => {
  it('401 without token on /admin/operators', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/operators' });
    expect(res.statusCode).toBe(401);
  });
  it('403 for operator role on /admin/operators', async () => {
    await createOperator({ email: 'op@test.example', password: 'correct horse battery staple' });
    const { accessToken } = await loginAsOperator(app, 'op@test.example', 'correct horse battery staple');
    const res = await app.inject({
      method: 'GET', url: '/v1/admin/operators',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /v1/admin/operators', () => {
  it('lists pending operators for admin', async () => {
    const { operatorId } = await createPendingOperator('pending@test.example');
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'GET', url: '/v1/admin/operators?status=PENDING_REVIEW',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data as any[];
    expect(data.length).toBe(1);
    expect(data[0].id).toBe(operatorId);
    expect(data[0].status).toBe('PENDING_REVIEW');
  });
});

describe('POST /v1/admin/operators/:id/approve', () => {
  it('approves operator and writes audit row', async () => {
    const { operatorId } = await createPendingOperator('approve-me@test.example');
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'POST', url: `/v1/admin/operators/${operatorId}/approve`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { reason: 'KYC docs verified and clean' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('APPROVED');
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'Operator', entityId: operatorId, action: 'operator_approved' },
    });
    expect(audit).toBeTruthy();
    expect(audit?.reason).toBe('KYC docs verified and clean');
  });
  it('422 when reason missing', async () => {
    const { operatorId } = await createPendingOperator('no-reason@test.example');
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'POST', url: `/v1/admin/operators/${operatorId}/approve`,
      headers: { authorization: `Bearer ${accessToken}` }, payload: {},
    });
    expect(res.statusCode).toBe(422);
  });
  it('422 when reason too short', async () => {
    const { operatorId } = await createPendingOperator('short-reason@test.example');
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'POST', url: `/v1/admin/operators/${operatorId}/approve`,
      headers: { authorization: `Bearer ${accessToken}` }, payload: { reason: 'ok' },
    });
    expect(res.statusCode).toBe(422);
  });
  it('400 INVALID_TRANSITION when already APPROVED', async () => {
    const { operatorId } = await createPendingOperator('already@test.example');
    await prisma.operator.update({ where: { id: operatorId }, data: { status: 'APPROVED' } });
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'POST', url: `/v1/admin/operators/${operatorId}/approve`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { reason: 'trying again' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_TRANSITION');
  });
});

describe('POST /v1/admin/operators/:id/reject', () => {
  it('rejects operator and writes audit row', async () => {
    const { operatorId } = await createPendingOperator('reject-me@test.example');
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'POST', url: `/v1/admin/operators/${operatorId}/reject`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { reason: 'PAN does not match GSTIN' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('REJECTED');
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'Operator', entityId: operatorId, action: 'operator_rejected' },
    });
    expect(audit).toBeTruthy();
  });
});

describe('POST /v1/admin/operators/:id/suspend', () => {
  it('suspends operator, revokes sessions, writes audit row', async () => {
    await createOperator({ email: 'suspend-me@test.example', password: 'correct horse battery staple' });
    const { accessToken: opToken } = await loginAsOperator(app, 'suspend-me@test.example', 'correct horse battery staple');
    const op = await prisma.operatorUser.findFirst({ where: { user: { email: 'suspend-me@test.example' } } });
    const operatorId = op!.operatorId;

    const { accessToken: adminToken } = await adminLogin();
    const res = await app.inject({
      method: 'POST', url: `/v1/admin/operators/${operatorId}/suspend`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { reason: 'Terms of service violation' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json().data;
    expect(body.operator.status).toBe('SUSPENDED');
    expect(body.sessionsRevoked).toBeGreaterThanOrEqual(1);

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'Operator', entityId: operatorId, action: 'operator_suspended' },
    });
    expect(audit).toBeTruthy();

    // Suspended operator's token rejected on next request
    const meRes = await app.inject({
      method: 'GET', url: '/v1/operator/me',
      headers: { authorization: `Bearer ${opToken}` },
    });
    expect(meRes.statusCode).toBe(401);
  });
  it('400 INVALID_TRANSITION when status is PENDING_REVIEW', async () => {
    const { operatorId } = await createPendingOperator('cannot-suspend@test.example');
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'POST', url: `/v1/admin/operators/${operatorId}/suspend`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { reason: 'trying to suspend pending' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_TRANSITION');
  });
});

describe('POST /v1/admin/buses/:id/approve', () => {
  it('approves a PENDING bus and writes audit row', async () => {
    const { operatorId } = await createPendingOperator('bus-owner@test.example');
    const bus = await createBus({ operatorId, capacity: 40, approvalStatus: 'PENDING' });
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'POST', url: `/v1/admin/buses/${bus.id}/approve`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { reason: 'insurance valid, model verified' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.approvalStatus).toBe('APPROVED');
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'Bus', entityId: bus.id, action: 'bus_approved' },
    });
    expect(audit).toBeTruthy();
  });
});

describe('POST /v1/admin/routes/:id/approve', () => {
  it('approves a PENDING route and writes audit row', async () => {
    const { operatorId } = await createPendingOperator('route-owner@test.example');
    const delhi = await createCity({ name: 'Delhi-route' });
    const lucknow = await createCity({ name: 'Lucknow-route' });
    const s1 = await createStand({ cityId: delhi.id });
    const s2 = await createStand({ cityId: lucknow.id });
    const route = await createRoute({
      operatorId,
      originCityId: delhi.id,
      destinationCityId: lucknow.id,
      stands: [
        { standId: s1.id, sequence: 1, distanceFromPrevKm: 0, durationFromPrevMin: 0 },
        { standId: s2.id, sequence: 2, distanceFromPrevKm: 500, durationFromPrevMin: 480 },
      ],
      approvalStatus: 'PENDING',
    });
    const { accessToken } = await adminLogin();
    const res = await app.inject({
      method: 'POST', url: `/v1/admin/routes/${route.id}/approve`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { reason: 'route geometry checked' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.approvalStatus).toBe('APPROVED');
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'Route', entityId: route.id, action: 'route_approved' },
    });
    expect(audit).toBeTruthy();
  });
});