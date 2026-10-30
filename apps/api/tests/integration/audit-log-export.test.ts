import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { auditRouter } from '../../src/modules/audit/audit.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createAdmin } from '../helpers/factories.js';
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
describe('GET /v1/admin/audit-logs/export', () => {
  it('empty result returns header-only CSV', async () => {
    const token = await adminToken();
    const entityId = newUuid();
    const res = await app.inject({
      method: 'GET', url: `/v1/admin/audit-logs/export?entityId=${entityId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment.*audit-logs/);
    expect(res.headers['x-export-row-count']).toBe('0');
    const lines = res.body.trim().split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('id,occurred_at,actor_id');
  });

  it('populated export has one line per row', async () => {
    const token = await adminToken();
    const entityId = newUuid();
    for (let i = 0; i < 3; i++) {
      await prisma.auditLog.create({
        data: {
          entityType: 'TestEntity', entityId, action: 'test_action',
          metadataJson: { _v: 1, i },
        },
      });
    }
    const res = await app.inject({
      method: 'GET', url: `/v1/admin/audit-logs/export?entityId=${entityId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-export-row-count']).toBe('3');
    const lines = res.body.trim().split('\n');
    expect(lines.length).toBe(4);
  });

  it('CSV escapes values with commas and quotes', async () => {
    const token = await adminToken();
    const entityId = newUuid();
    await prisma.auditLog.create({
      data: {
        entityType: 'TestEntity', entityId,
        action: 'test_action',
        reason: 'has,comma and "quotes" inside',
        metadataJson: { _v: 1 },
      },
    });
    const res = await app.inject({
      method: 'GET', url: `/v1/admin/audit-logs/export?entityId=${entityId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('"has,comma and ""quotes"" inside"');
  });

  it('returns capped=false for small exports', async () => {
    const token = await adminToken();
    const entityId = newUuid();
    await prisma.auditLog.create({
      data: { entityType: 'TestEntity', entityId, action: 'test_action', metadataJson: { _v: 1 } },
    });
    const res = await app.inject({
      method: 'GET', url: `/v1/admin/audit-logs/export?entityId=${entityId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.headers['x-export-capped']).toBe('false');
  });

  it('401 with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/audit-logs/export' });
    expect(res.statusCode).toBe(401);
  });
});