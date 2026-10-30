import Fastify, { type FastifyInstance } from 'fastify';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { attachRealtime, closeRealtime } from '../../src/realtime/server.js';

export interface WsTestServer { app: FastifyInstance; url: string; }

export async function startTestWsServer(): Promise<WsTestServer> {
  const app = Fastify({ logger: false });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port bound');
  attachRealtime(app.server);
  return { app, url: `http://127.0.0.1:${addr.port}` };
}

export async function stopTestWsServer(s: WsTestServer): Promise<void> {
  try { await closeRealtime(); } catch { /* best-effort */ }
  try { await s.app.close(); } catch { /* best-effort */ }
}

export function connectClient(url: string): ClientSocket {
  return ioClient(url, {
    path: '/v1/ws',
    transports: ['websocket'],
    reconnection: false,
    timeout: 3000,
    forceNew: true,
  });
}

export async function connectAndAuth(url: string, token: string): Promise<{ socket: ClientSocket; role: string }> {
  const socket = connectClient(url);
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('connect timeout')), 3000);
    socket.once('connect', () => { clearTimeout(t); resolve(); });
    socket.once('connect_error', (e: Error) => { clearTimeout(t); reject(e); });
  });
  const role = await new Promise<string>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('auth timeout')), 3000);
    const onOk = (p: { role: string }) => { clearTimeout(t); socket.off('error', onErr); resolve(p.role); };
    const onErr = (e: { message?: string }) => { clearTimeout(t); socket.off('auth:ok', onOk); reject(new Error(e && e.message ? e.message : 'auth_error')); };
    socket.once('auth:ok', onOk);
    socket.once('error', onErr);
    socket.emit('message', { action: 'auth', token });
  });
  return { socket, role };
}

export function waitForEvent<T = unknown>(socket: ClientSocket, eventName: string, timeoutMs = 5000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${eventName}`)), timeoutMs);
    socket.once(eventName, (p: T) => { clearTimeout(t); resolve(p); });
  });
}

export function waitForBusinessEvent<T = unknown>(socket: ClientSocket, eventName: string, timeoutMs = 5000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for business ${eventName}`)), timeoutMs);
    const handler = (envelope: { event: string; data: T }) => {
      if (envelope.event === eventName) { clearTimeout(t); socket.off('message', handler); resolve(envelope.data); }
    };
    socket.on('message', handler);
  });
}

export function expectClose(socket: ClientSocket, expectedCode: number, timeoutMs = 5000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout waiting for close')), timeoutMs);
    const done = () => { clearTimeout(t); socket.off('error', onErr); socket.off('disconnect', onDisc); resolve(); };
    const onErr = (e: { code?: unknown }) => { if (e && typeof e.code === 'number' && e.code === expectedCode) done(); };
    const onDisc = () => done();
    socket.on('error', onErr);
    socket.once('disconnect', onDisc);
  });
}