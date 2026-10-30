import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { prisma } from '../../src/lib/prisma.js';
import { redis, keys } from '../../src/lib/redis.js';
import { env } from '../../src/config/env.js';
import { newUuid } from '../../src/lib/ids.js';
import { issueSessionTokens } from '../../src/modules/identity/jwt.service.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import {
  startTestWsServer, stopTestWsServer, connectClient,
  connectAndAuth, waitForEvent, expectClose, type WsTestServer,
} from '../helpers/ws.js';

let server: WsTestServer;

beforeAll(async () => { server = await startTestWsServer(); });
afterAll(async () => { await stopTestWsServer(server); });
beforeEach(async () => { await resetIdentityTables(); });

async function createPassenger(): Promise<{ userId: string }> {
  const userId = newUuid();
  await prisma.user.create({
    data: {
      id: userId,
      phone: `+9197${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      phoneHash: newUuid(),
    },
  });
  return { userId };
}

async function createSession(userId: string): Promise<{ sessionId: string; accessToken: string; refreshToken: string }> {
  const sessionId = newUuid();
  const tokens = await issueSessionTokens({ userId, role: 'REGISTERED_PASSENGER', sessionId });
  return { sessionId, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}

describe('WS auth - handshake', () => {
  it('accepts valid JWT and returns auth:ok with role', async () => {
    const { userId } = await createPassenger();
    const { accessToken } = await createSession(userId);
    const { socket, role } = await connectAndAuth(server.url, accessToken);
    expect(role).toBe('REGISTERED_PASSENGER');
    socket.disconnect();
  });

  it('closes connection when auth is not sent within timeout', async () => {
    const socket = connectClient(server.url);
    await new Promise<void>((resolve) => { socket.once('connect', () => resolve()); });
    await expectClose(socket, 4003, 8000);
    socket.disconnect();
  }, 15000);

  it('rejects invalid JWT with close 4001', async () => {
    const socket = connectClient(server.url);
    await new Promise<void>((resolve) => { socket.once('connect', () => resolve()); });
    const closePromise = expectClose(socket, 4001, 5000);
    socket.emit('message', { action: 'auth', token: 'not-a-valid-jwt' });
    await closePromise;
    socket.disconnect();
  });

  it('rejects JWT whose session is in Redis revoke list', async () => {
    const { userId } = await createPassenger();
    const { sessionId, accessToken } = await createSession(userId);
    await redis.set(keys.revokedSession(sessionId), '1', 'EX', 3600);
    const socket = connectClient(server.url);
    await new Promise<void>((resolve) => { socket.once('connect', () => resolve()); });
    const closePromise = expectClose(socket, 4001, 5000);
    socket.emit('message', { action: 'auth', token: accessToken });
    await closePromise;
    socket.disconnect();
  });

  it('rejects JWT whose session is inactive in DB', async () => {
    const { userId } = await createPassenger();
    const { sessionId, accessToken } = await createSession(userId);
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'REVOKED', revokedAt: new Date(), revokeReason: 'TEST' },
    });
    const socket = connectClient(server.url);
    await new Promise<void>((resolve) => { socket.once('connect', () => resolve()); });
    const closePromise = expectClose(socket, 4001, 5000);
    socket.emit('message', { action: 'auth', token: accessToken });
    await closePromise;
    socket.disconnect();
  });
});

describe('WS auth - re-authentication', () => {
  it('emits auth:expiring shortly before token expiry', async () => {
    const { userId } = await createPassenger();
    const { sessionId } = await createSession(userId);
    const shortToken = jwt.sign(
      { sub: userId, sid: sessionId, role: 'REGISTERED_PASSENGER' },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: 3 },
    );
    const { socket } = await connectAndAuth(server.url, shortToken);
    const expiring = await waitForEvent<{ exp: number }>(socket, 'auth:expiring', 5000);
    expect(typeof expiring.exp).toBe('number');
    socket.disconnect();
  });

  it('rotates tokens when auth:refresh is sent with valid refreshToken', async () => {
    const { userId } = await createPassenger();
    const { accessToken, refreshToken } = await createSession(userId);
    const { socket } = await connectAndAuth(server.url, accessToken);
    const refreshed = await new Promise<{ accessToken: string; refreshToken: string }>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('refresh timeout')), 5000);
      socket.once('auth:refreshed', (p: { accessToken: string; refreshToken: string }) => { clearTimeout(t); resolve(p); });
      socket.once('error', (e: unknown) => { clearTimeout(t); reject(new Error(String(e))); });
      socket.emit('message', { action: 'auth:refresh', refreshToken });
    });
    expect(typeof refreshed.accessToken).toBe('string');
    expect(typeof refreshed.refreshToken).toBe('string');
    expect(refreshed.accessToken).not.toBe(accessToken);
    expect(refreshed.refreshToken).not.toBe(refreshToken);
    socket.disconnect();
  });

  it('closes connection when refresh window elapses without auth:refresh', async () => {
    const { userId } = await createPassenger();
    const { sessionId } = await createSession(userId);
    const shortToken = jwt.sign(
      { sub: userId, sid: sessionId, role: 'REGISTERED_PASSENGER' },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: 3 },
    );
    const { socket } = await connectAndAuth(server.url, shortToken);
    await waitForEvent(socket, 'auth:expiring', 5000);
    await expectClose(socket, 4001, 5000);
    socket.disconnect();
  });
});