import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { createPassenger, createAdmin, createDriver } from '../helpers/factories.js';
import { loginAsPassenger } from '../helpers/auth.js';
import {
  startTestWsServer, stopTestWsServer, connectAndAuth,
  waitForEvent, expectClose, type WsTestServer,
} from '../helpers/ws.js';

let server: WsTestServer;

beforeAll(async () => { server = await startTestWsServer(); });
afterAll(async () => { await stopTestWsServer(server); });
beforeEach(async () => { await resetIdentityTables(); });

async function loginAsAdminDirect(userId: string): Promise<string> {
  const { issueSessionTokens } = await import('../../src/modules/identity/jwt.service.js');
  const { accessToken } = await issueSessionTokens({
    userId,
    role: 'SUPER_ADMIN',
    sessionId: newUuid(),
  });
  return accessToken;
}

async function makeTrip() {
  const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 1 });
  const driver = await createDriver({ operatorId: seed.operatorId, kycStatus: 'VERIFIED' });
  const trip = await prisma.trip.create({
    data: {
      scheduleId: seed.schedule.id,
      busId: seed.bus.id,
      driverId: driver.driverProfile.id,
      status: 'SCHEDULED',
    },
  });
  return { seed, trip, driver };
}

describe('WS topics - seat:availability', () => {
  it('allows authenticated passenger to subscribe to a published schedule', async () => {
    const seed = await seedBookingScenario({ bookingCount: 0 });
    const stranger = await createPassenger();
    const token = await loginAsPassenger(stranger.id);
    const { socket } = await connectAndAuth(server.url, token);
    const subscribed = waitForEvent<{ topics: string[] }>(socket, 'subscribed', 5000);
    socket.emit('message', { action: 'subscribe', topics: [`seat:availability:${seed.schedule.id}`] });
    const result = await subscribed;
    expect(result.topics).toContain(`seat:availability:${seed.schedule.id}`);
    socket.disconnect();
  });

  it('rejects subscribe when schedule does not exist', async () => {
    const stranger = await createPassenger();
    const token = await loginAsPassenger(stranger.id);
    const { socket } = await connectAndAuth(server.url, token);
    const closed = expectClose(socket, 1008, 5000);
    socket.emit('message', { action: 'subscribe', topics: [`seat:availability:${newUuid()}`] });
    await closed;
    socket.disconnect();
  });
});

describe('WS topics - trip:live', () => {
  it('allows booked passenger to subscribe to trip:live', async () => {
    const { seed, trip } = await makeTrip();
    const token = await loginAsPassenger(seed.bookings[0].userId);
    const { socket } = await connectAndAuth(server.url, token);
    const subscribed = waitForEvent<{ topics: string[] }>(socket, 'subscribed', 5000);
    socket.emit('message', { action: 'subscribe', topics: [`trip:live:${trip.id}`] });
    const result = await subscribed;
    expect(result.topics).toContain(`trip:live:${trip.id}`);
    socket.disconnect();
  });

  it('rejects non-booked user subscribing to trip:live', async () => {
    const { trip } = await makeTrip();
    const stranger = await createPassenger();
    const token = await loginAsPassenger(stranger.id);
    const { socket } = await connectAndAuth(server.url, token);
    const closed = expectClose(socket, 1008, 5000);
    socket.emit('message', { action: 'subscribe', topics: [`trip:live:${trip.id}`] });
    await closed;
    socket.disconnect();
  });
});

describe('WS topics - booking', () => {
  it('allows booking owner to subscribe to own booking', async () => {
    const seed = await seedBookingScenario({ bookingCount: 1 });
    const booking = seed.bookings[0];
    const token = await loginAsPassenger(booking.userId);
    const { socket } = await connectAndAuth(server.url, token);
    const subscribed = waitForEvent<{ topics: string[] }>(socket, 'subscribed', 5000);
    socket.emit('message', { action: 'subscribe', topics: [`booking:${booking.id}`] });
    const result = await subscribed;
    expect(result.topics).toContain(`booking:${booking.id}`);
    socket.disconnect();
  });

  it('rejects non-owner subscribing to booking', async () => {
    const seed = await seedBookingScenario({ bookingCount: 1 });
    const booking = seed.bookings[0];
    const stranger = await createPassenger();
    const token = await loginAsPassenger(stranger.id);
    const { socket } = await connectAndAuth(server.url, token);
    const closed = expectClose(socket, 1008, 5000);
    socket.emit('message', { action: 'subscribe', topics: [`booking:${booking.id}`] });
    await closed;
    socket.disconnect();
  });
});

describe('WS topics - admin:notifications', () => {
  it('allows SUPER_ADMIN to subscribe', async () => {
    const admin = await createAdmin();
    const token = await loginAsAdminDirect(admin.id);
    const { socket } = await connectAndAuth(server.url, token);
    const subscribed = waitForEvent<{ topics: string[] }>(socket, 'subscribed', 5000);
    socket.emit('message', { action: 'subscribe', topics: ['admin:notifications'] });
    const result = await subscribed;
    expect(result.topics).toContain('admin:notifications');
    socket.disconnect();
  });

  it('rejects non-admin subscribing', async () => {
    const stranger = await createPassenger();
    const token = await loginAsPassenger(stranger.id);
    const { socket } = await connectAndAuth(server.url, token);
    const closed = expectClose(socket, 1008, 5000);
    socket.emit('message', { action: 'subscribe', topics: ['admin:notifications'] });
    await closed;
    socket.disconnect();
  });
});