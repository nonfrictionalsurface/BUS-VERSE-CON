import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { identityRouter } from '../../src/modules/identity/identity.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import {
  createPassenger,
  createOperator,
  createAdmin,
  createDriver,
} from '../helpers/factories.js';
import { loginAsOperator, loginAsAdmin } from '../helpers/auth.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(identityRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await resetIdentityTables();
});

describe('passenger OTP', () => {
  it('request with phone -> 200 + expiresInSeconds', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/passenger/auth/otp/request',
      payload: { phone: '+919876540001', intent: 'SIGNUP' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.expiresInSeconds).toBe(600);
  });

  it('request with BOTH phone+email -> 422', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/passenger/auth/otp/request',
      payload: { phone: '+919876540001', email: 'a@b.com', intent: 'LOGIN' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('SIGNUP + email -> 400 EMAIL_SIGNUP_NOT_SUPPORTED', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/passenger/auth/otp/request',
      payload: { email: 'a@b.com', intent: 'SIGNUP' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('EMAIL_SIGNUP_NOT_SUPPORTED');
  });

  it('SIGNUP + phone already registered -> 409', async () => {
    await createPassenger({ phone: '+919876540002' });
    const res = await app.inject({
      method: 'POST', url: '/v1/passenger/auth/otp/request',
      payload: { phone: '+919876540002', intent: 'SIGNUP' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('PHONE_ALREADY_REGISTERED');
  });

  it('verify correct OTP + existing user -> tokens', async () => {
    const user = await createPassenger({ phone: '+919876540003' });
    await app.inject({
      method: 'POST', url: '/v1/passenger/auth/otp/request',
      payload: { phone: '+919876540003', intent: 'LOGIN' },
    });
    const res = await app.inject({
      method: 'POST', url: '/v1/passenger/auth/otp/verify',
      payload: { phone: '+919876540003', otp: '123456' },
    });
    expect(res.statusCode).toBe(200);
    const { data } = res.json();
    expect(data.accessToken).toBeTruthy();
    expect(data.refreshToken).toBeTruthy();
    expect(data.user.id).toBe(user.id);
  });

  it('verify wrong OTP -> 400 INVALID_OTP', async () => {
    await createPassenger({ phone: '+919876540004' });
    await app.inject({
      method: 'POST', url: '/v1/passenger/auth/otp/request',
      payload: { phone: '+919876540004', intent: 'LOGIN' },
    });
    const res = await app.inject({
      method: 'POST', url: '/v1/passenger/auth/otp/verify',
      payload: { phone: '+919876540004', otp: '000000' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_OTP');
  });
});

describe('operator login', () => {
  it('correct credentials -> 200 + OPERATOR_OWNER role', async () => {
    await createOperator({ email: 'op@test.example', password: 'correct horse battery staple' });
    const result = await loginAsOperator(app, 'op@test.example', 'correct horse battery staple');
    expect(result.accessToken).toBeTruthy();
    const claims = JSON.parse(Buffer.from(result.accessToken.split('.')[1], 'base64url').toString());
    expect(claims.role).toBe('OPERATOR_OWNER');
  });

  it('wrong password -> 401 INVALID_CREDENTIALS', async () => {
    await createOperator({ email: 'op2@test.example', password: 'correct horse battery staple' });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/login',
      payload: { email: 'op2@test.example', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('INVALID_CREDENTIALS');
  });

  it('unknown email -> 401 (no enumeration)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/login',
      payload: { email: 'nobody@test.example', password: 'whatever' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('admin login', () => {
  it('correct credentials -> 200 + SUPER_ADMIN role', async () => {
    await createAdmin({ email: 'admin@test.example' });
    const result = await loginAsAdmin(app, 'admin@test.example', 'correct horse battery staple!!!');
    const claims = JSON.parse(Buffer.from(result.accessToken.split('.')[1], 'base64url').toString());
    expect(claims.role).toBe('SUPER_ADMIN');
  });

  it('wrong password -> 401', async () => {
    await createAdmin({ email: 'admin2@test.example' });
    const res = await app.inject({
      method: 'POST', url: '/v1/admin/auth/login',
      payload: { email: 'admin2@test.example', password: 'nope' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('driver single-device', () => {
  it('driver without VERIFIED KYC -> 403', async () => {
    await createDriver({ phone: '+919876543002', kycStatus: 'INVITED' });
    await app.inject({
      method: 'POST', url: '/v1/driver/auth/otp/request',
      payload: { phone: '+919876543002' },
    });
    const res = await app.inject({
      method: 'POST', url: '/v1/driver/auth/otp/verify',
      payload: { phone: '+919876543002', otp: '123456', deviceFingerprint: 'device-x-1234' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('refresh rotation', () => {
  it('valid refresh -> new tokens', async () => {
    await createOperator({ email: 'r@test.example', password: 'correct horse battery staple' });
    const first = await loginAsOperator(app, 'r@test.example', 'correct horse battery staple');

    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/refresh',
      payload: { refreshToken: first.refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.accessToken).toBeTruthy();
    expect(res.json().data.refreshToken).not.toBe(first.refreshToken);
  });

  it('replayed refresh -> 401 REFRESH_TOKEN_REPLAYED', async () => {
    await createOperator({ email: 'r2@test.example', password: 'correct horse battery staple' });
    const first = await loginAsOperator(app, 'r2@test.example', 'correct horse battery staple');

    await app.inject({
      method: 'POST', url: '/v1/operator/auth/refresh',
      payload: { refreshToken: first.refreshToken },
    });

    const replay = await app.inject({
      method: 'POST', url: '/v1/operator/auth/refresh',
      payload: { refreshToken: first.refreshToken },
    });
    expect(replay.statusCode).toBe(401);
    expect(replay.json().error.code).toBe('REFRESH_TOKEN_REPLAYED');
  });
});

describe('logout', () => {
  it('after logout, access token rejected', async () => {
    await createAdmin({ email: 'lo@test.example' });
    const { accessToken } = await loginAsAdmin(app, 'lo@test.example', 'correct horse battery staple!!!');

    const out = await app.inject({
      method: 'POST', url: '/v1/admin/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(out.statusCode).toBe(204);

    const out2 = await app.inject({
      method: 'POST', url: '/v1/admin/auth/logout',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(out2.statusCode).toBe(401);
  });
});

describe('password reset (email)', () => {
  it('request for unknown email -> still 200', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/reset/request',
      payload: { email: 'nobody@test.example' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('verify invalid token -> 400 RESET_TOKEN_INVALID', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/reset/verify',
      payload: { token: 'a'.repeat(40), newPassword: 'brand new password 12x' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('RESET_TOKEN_INVALID');
  });

  it('operator reset verify rejects password < 12 chars -> 422', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/reset/verify',
      payload: { token: 'a'.repeat(40), newPassword: 'short' },
    });
    expect(res.statusCode).toBe(422);
  });
});

describe('password reset (OTP fallback)', () => {
  it('admin reset verify rejects password < 16 chars -> 422', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/admin/auth/reset/verify',
      payload: { phone: '+919876542001', otp: '123456', newPassword: 'fifteenChars12!' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('RESET OTP cannot be consumed as LOGIN OTP (purpose isolation)', async () => {
    await createOperator({ email: 'p@test.example', phone: '+919876541111' });
    await app.inject({
      method: 'POST', url: '/v1/operator/auth/otp/request',
      payload: { phone: '+919876541111' },
    });
    const res = await app.inject({
      method: 'POST', url: '/v1/operator/auth/reset/verify',
      payload: { phone: '+919876541111', otp: '123456', newPassword: 'new password 12 chars' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('OTP_EXPIRED');
  });
});