import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as events from '../../src/realtime/events.js';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';
import { issueSessionTokens } from '../../src/modules/identity/jwt.service.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createPassenger } from '../helpers/factories.js';
import {
  startTestWsServer, stopTestWsServer, connectClient, connectAndAuth,
  expectClose, type WsTestServer,
} from '../helpers/ws.js';

let server: WsTestServer;

beforeAll(async () => { server = await startTestWsServer(); });
afterAll(async () => { await stopTestWsServer(server); });
beforeEach(async () => { await resetIdentityTables(); });

async function createSession(userId: string): Promise<{ sessionId: string; accessToken: string; refreshToken: string }> {
  const sessionId = newUuid();
  const tokens = await issueSessionTokens({ userId, role: 'REGISTERED_PASSENGER', sessionId });
  return { sessionId, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}

// ---------- 16 payload schemas (TV-P-01 through TV-P-16) ----------
describe('payload schemas - one per event (shared/04 §12.2)', () => {
  it('seat:locked - _v, seatId, lockedUntil, lockedByMe', () => {
    const e = events.seatLocked({ seatId: 's1', lockedUntil: '2026-10-25T14:35:00.000Z', lockedByMe: false });
    expect(e).toEqual({ event: 'seat:locked', data: { _v: 1, seatId: 's1', lockedUntil: '2026-10-25T14:35:00.000Z', lockedByMe: false } });
  });

  it('seat:released - _v, seatId, reason', () => {
    const e = events.seatReleased({ seatId: 's1', reason: 'manual' });
    expect(e).toEqual({ event: 'seat:released', data: { _v: 1, seatId: 's1', reason: 'manual' } });
  });

  it('seat:booked - _v, seatId, bookingId', () => {
    const e = events.seatBooked({ seatId: 's1', bookingId: 'b1' });
    expect(e).toEqual({ event: 'seat:booked', data: { _v: 1, seatId: 's1', bookingId: 'b1' } });
  });

  it('bus:position - full 11-field payload (shared/04 §4.2 Event 4)', () => {
    const e = events.busPosition({
      tripId: 't1', scheduleId: 'sch1',
      lat: 26.8467, lng: 80.9462, speedKmh: 62.5,
      bearing: null, accuracyM: 12.4,
      recordedAt: '2026-10-25T14:32:00.000Z', receivedAt: '2026-10-25T14:32:00.180Z',
      nextStandId: null, etaMinutes: null,
    });
    expect(e.event).toBe('bus:position');
    expect(e.data._v).toBe(1);
    expect(e.data).toMatchObject({
      tripId: 't1', scheduleId: 'sch1', lat: 26.8467, lng: 80.9462, speedKmh: 62.5,
      bearing: null, accuracyM: 12.4, nextStandId: null, etaMinutes: null,
    });
  });

  it('trip:started - _v, tripId, startedAt', () => {
    const e = events.tripStarted({ tripId: 't1', startedAt: '2026-10-25T14:00:00.000Z' });
    expect(e).toEqual({ event: 'trip:started', data: { _v: 1, tripId: 't1', startedAt: '2026-10-25T14:00:00.000Z' } });
  });

  it('trip:delayed - _v, tripId, reason enum, minutes', () => {
    const e = events.tripDelayed({ tripId: 't1', reason: 'TRAFFIC', minutes: 30 });
    expect(e).toEqual({ event: 'trip:delayed', data: { _v: 1, tripId: 't1', reason: 'TRAFFIC', minutes: 30 } });
  });

  it('trip:ended - _v, tripId, endedAt, distanceKm', () => {
    const e = events.tripEnded({ tripId: 't1', endedAt: '2026-10-25T22:30:00.000Z', distanceKm: 512.4 });
    expect(e).toEqual({ event: 'trip:ended', data: { _v: 1, tripId: 't1', endedAt: '2026-10-25T22:30:00.000Z', distanceKm: 512.4 } });
  });

  it('trip:cancelled - _v, tripId, reason', () => {
    const e = events.tripCancelled({ tripId: 't1', reason: 'Operator cancelled' });
    expect(e).toEqual({ event: 'trip:cancelled', data: { _v: 1, tripId: 't1', reason: 'Operator cancelled' } });
  });

  it('booking:confirmed - _v, bookingId, ticketId, totalFarePaise', () => {
    const e = events.bookingConfirmed({ bookingId: 'b1', ticketId: 'tkt1', totalFarePaise: 48750 });
    expect(e).toEqual({ event: 'booking:confirmed', data: { _v: 1, bookingId: 'b1', ticketId: 'tkt1', totalFarePaise: 48750 } });
  });

  it('booking:cancelled - _v, bookingId, reason enum, refundId nullable', () => {
    const e = events.bookingCancelled({ bookingId: 'b1', reason: 'PASSENGER_CANCELLED', refundId: null });
    expect(e).toEqual({ event: 'booking:cancelled', data: { _v: 1, bookingId: 'b1', reason: 'PASSENGER_CANCELLED', refundId: null } });
  });

  it('booking:expired - _v, bookingId', () => {
    const e = events.bookingExpired({ bookingId: 'b1' });
    expect(e).toEqual({ event: 'booking:expired', data: { _v: 1, bookingId: 'b1' } });
  });

  it('boarding:verified - _v, multi-passenger fields', () => {
    const e = events.boardingVerified({
      bookingId: 'b1', ticketId: 'tkt1', passengerCount: 3,
      allSeatLabels: ['A1', 'A2', 'A3'], boardedAt: '2026-10-25T14:30:00.000Z',
    });
    expect(e).toEqual({
      event: 'boarding:verified',
      data: { _v: 1, bookingId: 'b1', ticketId: 'tkt1', passengerCount: 3, allSeatLabels: ['A1', 'A2', 'A3'], boardedAt: '2026-10-25T14:30:00.000Z' },
    });
  });

  it('payment:succeeded - _v, paymentId, bookingId, method nullable', () => {
    const e = events.paymentSucceeded({ paymentId: 'p1', bookingId: 'b1', method: 'UPI' });
    expect(e).toEqual({ event: 'payment:succeeded', data: { _v: 1, paymentId: 'p1', bookingId: 'b1', method: 'UPI' } });
    const nullMethod = events.paymentSucceeded({ paymentId: 'p2', bookingId: 'b2', method: null });
    expect(nullMethod.data.method).toBeNull();
  });

  it('operator:applied - _v, operatorId, companyName, submittedAt', () => {
    const e = events.operatorApplied({ operatorId: 'o1', companyName: 'Sharma Travels', submittedAt: '2026-10-25T10:00:00.000Z' });
    expect(e).toEqual({ event: 'operator:applied', data: { _v: 1, operatorId: 'o1', companyName: 'Sharma Travels', submittedAt: '2026-10-25T10:00:00.000Z' } });
  });

  it('refund:requested - _v, refundId, bookingId, amountPaise, reason', () => {
    const e = events.refundRequested({ refundId: 'r1', bookingId: 'b1', amountPaise: 48750, reason: 'DUPLICATE_CHARGE' });
    expect(e).toEqual({ event: 'refund:requested', data: { _v: 1, refundId: 'r1', bookingId: 'b1', amountPaise: 48750, reason: 'DUPLICATE_CHARGE' } });
  });

  it('gps_anomaly - _v, failureCount, lastFailureType enum', () => {
    const e = events.gpsAnomaly({ tripId: 't1', driverId: 'd1', failureCount: 5, lastFailureType: 'TELEPORT_DETECTED', detectedAt: '2026-10-25T14:15:00.000Z' });
    expect(e).toEqual({
      event: 'gps_anomaly',
      data: { _v: 1, tripId: 't1', driverId: 'd1', failureCount: 5, lastFailureType: 'TELEPORT_DETECTED', detectedAt: '2026-10-25T14:15:00.000Z' },
    });
  });

  it('EVENT_NAMES array covers all 16', () => {
    expect(events.EVENT_NAMES.length).toBe(16);
    expect(new Set(events.EVENT_NAMES).size).toBe(16);
  });
});

// ---------- 3 reconnection behavior tests (TV-R-01 through TV-R-03) ----------
describe('reconnection behavior - server-side guarantees (shared/04 §12.4)', () => {
  it('TV-R-01: new connection with same JWT succeeds after clean disconnect', async () => {
    const { id: userId } = await createPassenger();
    const { accessToken } = await createSession(userId);
    const { socket: s1 } = await connectAndAuth(server.url, accessToken);
    s1.disconnect();
    await new Promise((r) => setTimeout(r, 100));
    const { socket: s2, role } = await connectAndAuth(server.url, accessToken);
    expect(role).toBe('REGISTERED_PASSENGER');
    s2.disconnect();
  });

  it('TV-R-02: new connection with same JWT succeeds after auth timeout close', async () => {
    const { id: userId } = await createPassenger();
    const { accessToken } = await createSession(userId);
    const socket = connectClient(server.url);
    await new Promise<void>((r) => socket.once('connect', () => r()));
    await expectClose(socket, 4003, 8000);
    const { socket: s2, role } = await connectAndAuth(server.url, accessToken);
    expect(role).toBe('REGISTERED_PASSENGER');
    s2.disconnect();
  });

  it('TV-R-03: after auth:refresh, rotated access token works on new connection', async () => {
    const { id: userId } = await createPassenger();
    const { accessToken, refreshToken } = await createSession(userId);
    const { socket: s1 } = await connectAndAuth(server.url, accessToken);
    const refreshed = await new Promise<{ accessToken: string }>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('refresh timeout')), 5000);
      s1.once('auth:refreshed', (p: { accessToken: string }) => { clearTimeout(t); resolve(p); });
      s1.emit('message', { action: 'auth:refresh', refreshToken });
    });
    s1.disconnect();
    await new Promise((r) => setTimeout(r, 100));
    const { socket: s2, role } = await connectAndAuth(server.url, refreshed.accessToken);
    expect(role).toBe('REGISTERED_PASSENGER');
    s2.disconnect();
  });
});