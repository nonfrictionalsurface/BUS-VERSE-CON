import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { verifyAccessToken, rotateRefreshToken } from '../modules/identity/jwt.service.js';
import { verifyHandshake, isWsAuthError, type WsClaims } from './auth.js';
import { subscribeToTopic } from './topics.js';
import { setIO, clearAllThrottleState } from './emit.js';

const AUTH_TIMEOUT_MS = 5000;
const AUTH_EXPIRING_LEAD_MS = env.WS_AUTH_EXPIRING_LEAD_SEC * 1000;
const AUTH_REFRESH_WINDOW_MS = env.WS_AUTH_REFRESH_WINDOW_SEC * 1000;
const MAX_MESSAGE_BYTES = 64 * 1024;

let io: SocketIOServer | null = null;

interface SocketMeta {
  claims: WsClaims | null;
  authTimer: NodeJS.Timeout | null;
  expiringTimer: NodeJS.Timeout | null;
  refreshTimer: NodeJS.Timeout | null;
}

const metaMap = new WeakMap<Socket, SocketMeta>();

function getAllowedOrigins(): string[] {
  return env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
}

function originAllowed(origin: string | undefined): boolean {
  if (!origin) return env.NODE_ENV === 'test';
  return getAllowedOrigins().includes(origin);
}

function closeWith(socket: Socket, code: number, message: string): void {
  try {
    socket.emit('error', { code, message });
    socket.disconnect(true);
  } catch (err) {
    logger.warn({ err, code }, 'socket close failed');
  }
}

function clearTimers(m: SocketMeta): void {
  if (m.authTimer) clearTimeout(m.authTimer);
  if (m.expiringTimer) clearTimeout(m.expiringTimer);
  if (m.refreshTimer) clearTimeout(m.refreshTimer);
  m.authTimer = null; m.expiringTimer = null; m.refreshTimer = null;
}

function scheduleReAuth(socket: Socket, m: SocketMeta, claims: WsClaims): void {
  const nowSec = Math.floor(Date.now() / 1000);
  const expiringInMs = Math.max(0, (claims.exp - 60 - nowSec) * 1000);
  m.expiringTimer = setTimeout(() => {
    if (!socket.connected) return;
    socket.emit('auth:expiring', { exp: claims.exp });
    m.refreshTimer = setTimeout(() => {
      if (socket.connected) closeWith(socket, 4001, 'TOKEN_EXPIRED');
    }, AUTH_REFRESH_WINDOW_MS).unref();
  }, expiringInMs).unref();
}

async function handleAuth(socket: Socket, m: SocketMeta, raw: { token?: unknown }): Promise<void> {
  if (m.claims) { socket.emit('error', { code: 400, message: 'ALREADY_AUTHENTICATED' }); return; }
  if (typeof raw.token !== 'string') { closeWith(socket, 4001, 'INVALID_AUTH_MESSAGE'); return; }
  try {
    const claims = await verifyHandshake(raw.token);
    m.claims = claims;
    if (m.authTimer) { clearTimeout(m.authTimer); m.authTimer = null; }
    socket.join(`user:${claims.userId}`);
    socket.emit('auth:ok', { role: claims.role });
    scheduleReAuth(socket, m, claims);
  } catch (err) {
    const reason = isWsAuthError(err) ? err.reason : 'INVALID_TOKEN';
    closeWith(socket, 4001, reason);
  }
}

async function handleSubscribe(socket: Socket, m: SocketMeta, raw: { topics?: unknown }): Promise<void> {
  if (!m.claims) { closeWith(socket, 4001, 'NOT_AUTHENTICATED'); return; }
  const topics = Array.isArray(raw.topics) ? raw.topics : [];
  if (topics.length === 0) { socket.emit('error', { code: 400, message: 'NO_TOPICS' }); return; }
  for (const t of topics) {
    if (typeof t !== 'string') continue;
    const result = await subscribeToTopic(socket, t, m.claims);
    if (!result.allowed) { closeWith(socket, 1008, result.reason ?? 'FORBIDDEN'); return; }
  }
  socket.emit('subscribed', { topics });
}

async function handleAuthRefresh(socket: Socket, m: SocketMeta, raw: { refreshToken?: unknown }): Promise<void> {
  if (!m.claims) { closeWith(socket, 4001, 'NOT_AUTHENTICATED'); return; }
  if (typeof raw.refreshToken !== 'string') { closeWith(socket, 4001, 'INVALID_REFRESH'); return; }
  try {
    const tokens = await rotateRefreshToken(raw.refreshToken);
    const decoded = verifyAccessToken(tokens.accessToken);
    m.claims = { userId: decoded.sub, sessionId: decoded.sid, role: decoded.role, exp: decoded.exp };
    if (m.refreshTimer) { clearTimeout(m.refreshTimer); m.refreshTimer = null; }
    if (m.expiringTimer) { clearTimeout(m.expiringTimer); m.expiringTimer = null; }
    socket.emit('auth:refreshed', {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });
    scheduleReAuth(socket, m, m.claims);
  } catch (err) {
    logger.warn({ err, userId: m.claims.userId }, 'auth:refresh failed');
    closeWith(socket, 4001, 'REFRESH_FAILED');
  }
}

async function handleMessage(socket: Socket, m: SocketMeta, raw: unknown): Promise<void> {
  if (!raw || typeof raw !== 'object') {
    socket.emit('error', { code: 400, message: 'INVALID_MESSAGE' });
    return;
  }
  const msg = raw as { action?: unknown; token?: unknown; refreshToken?: unknown; topics?: unknown };
  if (msg.action === 'auth') { await handleAuth(socket, m, msg); return; }
  if (msg.action === 'subscribe') { await handleSubscribe(socket, m, msg); return; }
  if (msg.action === 'auth:refresh') { await handleAuthRefresh(socket, m, msg); return; }
  socket.emit('error', { code: 400, message: 'UNKNOWN_ACTION' });
}

export function attachRealtime(httpServer: HttpServer): SocketIOServer {
  if (io) return io;
  io = new SocketIOServer(httpServer, {
    path: '/v1/ws',
    cors: { origin: getAllowedOrigins(), credentials: true },
    maxHttpBufferSize: MAX_MESSAGE_BYTES,
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    if (!originAllowed(socket.handshake.headers.origin)) return next(new Error('ORIGIN_NOT_ALLOWED'));
    next();
  });

  io.on('connection', (socket) => {
    logger.debug({ id: socket.id }, 'ws connection opened');
    const m: SocketMeta = { claims: null, authTimer: null, expiringTimer: null, refreshTimer: null };
    metaMap.set(socket, m);
    m.authTimer = setTimeout(() => {
      if (!m.claims) closeWith(socket, 4003, 'AUTH_TIMEOUT');
    }, AUTH_TIMEOUT_MS).unref();
    socket.on('message', (raw: unknown) => { void handleMessage(socket, m, raw); });
    socket.on('disconnect', (reason) => {
      logger.debug({ id: socket.id, reason }, 'ws connection closed');
      clearTimers(m);
    });
  });

  setIO(io);
  logger.info({ path: '/v1/ws' }, 'ws server attached');
  return io;
}

export async function closeRealtime(): Promise<void> {
  if (!io) return;
  clearAllThrottleState();
  const server = io;
  io = null;
  setIO(null);
  await new Promise<void>((resolve) => { server.close(() => resolve()); });
  logger.info('ws server closed');
}