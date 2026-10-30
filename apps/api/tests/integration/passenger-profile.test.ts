import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { identityRouter } from '../../src/modules/identity/identity.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createPassenger, createOperator } from '../helpers/factories.js';
import { loginAsPassenger } from '../helpers/auth.js';
import { prisma } from '../../src/lib/prisma.js';
import { issueSessionTokens } from '../../src/modules/identity/jwt.service.js';
import { newUuid } from '../../src/lib/ids.js';
import { computePhoneHash } from '../../src/lib/phone.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(identityRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});

afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetIdentityTables(); });
describe('GET /v1/passenger/me', () => {
  it('returns 200 with full profile shape', async () => {
    const user = await createPassenger({ email: 'alice@example.com' });
    const token = await loginAsPassenger(user.id);
    const res = await app.inject({
      method: 'GET', url: '/v1/passenger/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const d = res.json().data;
    expect(d.userId).toBe(user.id);
    expect(d.phone).toBe(user.phone);
    expect(d.email).toBe('alice@example.com');
    expect(d.emailVerified).toBe(false);
    expect(d.passengerProfile).not.toBeNull();
    expect(d.passengerProfile.name).toBe('Test Passenger');
    expect(typeof d.createdAt).toBe('string');
  });

  it('returns 200 with passengerProfile null when none exists', async () => {
    const digits = newUuid().replace(/-/g, '').split('').map((c) => (parseInt(c, 16) % 10).toString()).join('').slice(0, 9);
    const phone = `+9197${digits}`;
    const user = await prisma.user.create({
      data: { phone, phoneHash: computePhoneHash(phone) },
    });
    const token = await loginAsPassenger(user.id);
    const res = await app.inject({
      method: 'GET', url: '/v1/passenger/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.passengerProfile).toBeNull();
  });

  it('returns 401 UNAUTHORIZED with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/passenger/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 FORBIDDEN with operator-role token', async () => {
    const opUser = await createOperator();
    const { accessToken } = await issueSessionTokens({
      userId: opUser.id,
      role: 'OPERATOR_OWNER',
      sessionId: newUuid(),
    });
    const res = await app.inject({
      method: 'GET', url: '/v1/passenger/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });
});