import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { prisma } from '../../src/lib/prisma.js';
import { resetIdentityTables } from '../helpers/test-db.js';

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
  const { identityRouter } = await import('../../src/modules/identity/identity.router.js');
  await app.register(identityRouter, { prefix: '/v1' });
  await app.listen({ port: 0, host: '127.0.0.1' });
}

beforeEach(async () => {
  await resetIdentityTables();
  if (!app) await buildServer();
});
afterAll(async () => {
  try { await app?.close(); } catch { /* best-effort */ }
});

const validBody = {
  companyName: 'Sharma Travels Pvt Ltd',
  gstin: '09AAACH7409R1ZZ',
  pan: 'AAACH7409R',
  email: 'founder@sharmatravels.com',
  phone: '+919876543210',
  password: 'SecurePass123!',
};

describe('POST /v1/operator/auth/signup', () => {
  it('happy path — creates User + Operator + OperatorUser + consents, returns 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/signup', payload: validBody,
    });
    expect(res.statusCode, `body: ${res.body}`).toBe(201);
    const data = res.json().data;
    expect(data).toHaveProperty('operatorId');
    expect(data).toHaveProperty('userId');
    expect(data.status).toBe('APPLIED');

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    expect(user?.email).toBe('founder@sharmatravels.com');
    expect(user?.emailVerified).toBe(false);

    const operator = await prisma.operator.findUnique({ where: { id: data.operatorId } });
    expect(operator?.status).toBe('APPLIED');
    expect(operator?.gstin).toBe('09AAACH7409R1ZZ');

    const opUser = await prisma.operatorUser.findFirst({ where: { userId: data.userId } });
    expect(opUser?.role).toBe('OWNER');
    expect(opUser?.passwordHash).not.toBe(validBody.password);

    const consents = await prisma.consentRecord.count({ where: { userId: data.userId } });
    expect(consents).toBe(2);

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: data.operatorId, entityType: 'Operator', action: 'operator_signup' },
    });
    expect(audit).not.toBeNull();
  });

  it('duplicate email → 409 EMAIL_ALREADY_REGISTERED', async () => {
    await app.inject({ method: 'POST', url: '/v1/operator/auth/signup', payload: validBody });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/signup',
      payload: { ...validBody, gstin: '29AAACH7409R1ZZ', pan: 'AAACH7409R', phone: '+919876543211' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('duplicate phone → 409 PHONE_ALREADY_REGISTERED', async () => {
    await app.inject({ method: 'POST', url: '/v1/operator/auth/signup', payload: validBody });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/signup',
      payload: { ...validBody, gstin: '29AAACH7409R1ZZ', pan: 'AAACH7409R', email: 'other@example.com' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('PHONE_ALREADY_REGISTERED');
  });

  it('duplicate GSTIN → 409 GSTIN_ALREADY_REGISTERED', async () => {
    await app.inject({ method: 'POST', url: '/v1/operator/auth/signup', payload: validBody });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/signup',
      payload: { ...validBody, email: 'other@example.com', phone: '+919876543211' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('GSTIN_ALREADY_REGISTERED');
  });

  it('invalid GSTIN format → 422 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/signup',
      payload: { ...validBody, gstin: 'INVALID' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('invalid PAN format → 422 VALIDATION_ERROR', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/signup',
      payload: { ...validBody, pan: 'BAD-PAN' },
    });
    expect(res.statusCode).toBe(422);
  });
});