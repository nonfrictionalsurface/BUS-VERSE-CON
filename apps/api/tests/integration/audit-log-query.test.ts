import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { auditRouter } from '../../src/modules/audit/audit.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createAdmin, createPassenger } from '../helpers/factories.js';
import { prisma } from '../../src/lib/prisma.js';
import { issueSessionTokens } from '../../src/modules/identity/jwt.service.js';
import { newUuid } from '../../src/lib/ids.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(auditRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetIdentityTables(); });

async function adminToken(): Promise<string> {
  const admin = await createAdmin();
  const { accessToken } = await issueSessionTokens({
    userId: admin.id, role: 'SUPER_ADMIN', sessionId: newUuid(),
  });
  return accessToken;
}

async function seedAuditRows(params: {
  entityId: string;
  count: number;
  action?: string;
  actorId?: string | null;
  entityType?: string;
}) {
  const ids: string[] = [];
  for (let i = 0; i < params.count; i++) {
    const row = await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        entityType: params.entityType ?? 'TestEntity',
        entityId: params.entityId,
        action: params.action ?? 'test_action',
        metadataJson: { _v: 1, i },
      },
    });
    ids.push(row.id);
  }
  return ids;
}
describe('GET /v1/admin/audit-logs — happy path', () => {
  it('returns 200 with paginated data + nextCursor', async () => {
    const token = await adminToken();
    const entityId = newUuid();
    await seedAuditRows({ entityId, count: 3 });
    const res = await app.inject({
      method: 'GET', url: `/v1/admin/audit-logs?entityId=${entityId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(3);
    expect(res.json().meta.nextCursor).toBeNull();
  });

  it('filters by entityType', async () => {
    const token = await adminToken();
    const entityId = newUuid();
    await seedAuditRows({ entityId, count: 2, entityType: 'UniqueType' });
    const res = await app.inject({
      method: 'GET', url: `/v1/admin/audit-logs?entityType=UniqueType&entityId=${entityId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(2);
    expect(res.json().data.every((d: { entityType: string }) => d.entityType === 'UniqueType')).toBe(true);
  });

  it('filters by action', async () => {
    const token = await adminToken();
    const entityId = newUuid();
    await seedAuditRows({ entityId, count: 2, action: 'unique_action_xyz' });
    const res = await app.inject({
      method: 'GET', url: `/v1/admin/audit-logs?action=unique_action_xyz&entityId=${entityId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(2);
  });

  it('filters by actorId', async () => {
    const token = await adminToken();
    const entityId = newUuid();
    const actorId = newUuid();
    await seedAuditRows({ entityId, count: 2, actorId });
    await seedAuditRows({ entityId, count: 1, actorId: null });
    const res = await app.inject({
      method: 'GET', url: `/v1/admin/audit-logs?actorId=${actorId}&entityId=${entityId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(2);
  });
});
describe('GET /v1/admin/audit-logs — pagination + date range', () => {
  it('cursor pagination fetches next page', async () => {
    const token = await adminToken();
    const entityId = newUuid();
    await seedAuditRows({ entityId, count: 3 });
    const p1 = await app.inject({
      method: 'GET', url: `/v1/admin/audit-logs?entityId=${entityId}&limit=2`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(p1.json().data.length).toBe(2);
    expect(p1.json().meta.nextCursor).not.toBeNull();
    const cursor = p1.json().meta.nextCursor;
    const p2 = await app.inject({
      method: 'GET', url: `/v1/admin/audit-logs?entityId=${entityId}&limit=2&cursor=${encodeURIComponent(cursor)}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(p2.json().data.length).toBe(1);
  });

  it('date range filter narrows results', async () => {
    const token = await adminToken();
    const entityId = newUuid();
    await seedAuditRows({ entityId, count: 2 });
    // R63: compute IST date, not UTC date. Between 00:00 and 05:30 IST the
    // UTC date is still "yesterday" → istDayBounds filter misses today's rows.
    const istNow = new Date(Date.now() + 5.5 * 3_600_000);
    const today = istNow.toISOString().slice(0, 10);
    const res = await app.inject({
      method: 'GET', url: `/v1/admin/audit-logs?entityId=${entityId}&from=${today}&to=${today}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBe(2);
  });
});

describe('GET /v1/admin/audit-logs — auth', () => {
  it('401 with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/audit-logs' });
    expect(res.statusCode).toBe(401);
  });

  it('403 with passenger token', async () => {
    const p = await createPassenger();
    const { accessToken } = await issueSessionTokens({ userId: p.id, role: 'REGISTERED_PASSENGER', sessionId: newUuid() });
    const res = await app.inject({
      method: 'GET', url: '/v1/admin/audit-logs',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('audit_logs immutability (09 §15.3)', () => {
  it('UPDATE via raw SQL is rejected by trigger', async () => {
    const entityId = newUuid();
    const [id] = await seedAuditRows({ entityId, count: 1 });
    let threw = false;
    try {
      await prisma.$executeRaw`UPDATE audit_logs SET action = 'tampered' WHERE id = ${id}::uuid`;
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    const row = await prisma.auditLog.findUnique({ where: { id } });
    expect(row?.action).toBe('test_action');
  });
});