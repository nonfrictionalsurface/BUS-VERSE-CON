import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { tripRouter } from '../../src/modules/trip/trip.router.js';
import { issueTicket } from '../../src/modules/booking/ticket.service.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createDriver, createPassenger } from '../helpers/factories.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { prisma } from '../../src/lib/prisma.js';
import { issueSessionTokens } from '../../src/modules/identity/jwt.service.js';
import { newUuid } from '../../src/lib/ids.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(tripRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});
afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetIdentityTables(); });

async function setupScanScene() {
  const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 1, status: 'CONFIRMED' });
  const booking = await prisma.booking.findFirst({
    where: { userId: seed.bookings[0]!.userId },
    include: { passengers: { include: { seat: true } } },
  });
  if (!booking) throw new Error('booking not created');

  const ticketResult = await prisma.$transaction(async (tx) =>
    issueTicket(tx, {
      bookingId: booking.id,
      scheduleId: seed.schedule.id,
      boardingStandId: seed.stand1.id,
      passengers: booking.passengers.map((p) => ({
        seatId: p.seatId,
        seatLabel: p.seat.seatLabel,
        name: p.name,
      })),
    }),
  );

  const driver = await createDriver({ operatorId: seed.operatorId, kycStatus: 'VERIFIED' });
  const trip = await prisma.trip.create({
    data: {
      scheduleId: seed.schedule.id,
      busId: seed.bus.id,
      driverId: driver.driverProfile!.id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });
  const { accessToken } = await issueSessionTokens({ userId: driver.id, role: 'DRIVER', sessionId: newUuid() });

  return { seed, booking, ticket: ticketResult, driver, trip, token: accessToken };
}

function tamperSig(wire: string): string {
  // Tamper middle of signature — last chars are base64 padding, flipping them
  // decodes to unchanged signature bytes and verify() still passes.
  const parts = wire.split(':');
  if (parts.length !== 3) return wire;
  const sig = parts[2]!;
  const mid = Math.floor(sig.length / 2);
  const orig = sig[mid];
  const flipped = orig === 'A' ? 'B' : 'A';
  return `${parts[0]}:${parts[1]}:${sig.slice(0, mid)}${flipped}${sig.slice(mid + 1)}`;
}
describe('POST /v1/driver/trips/:id/scan — happy', () => {
  it('VALID: scan real ticket → CHECKED_IN + ticket SCANNED + boarding_scan row', async () => {
    const { token, trip, ticket, booking } = await setupScanScene();
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`,
      headers: { authorization: `Bearer ${token}` },
      payload: { qrPayload: ticket.wireFormat, scannedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.result).toBe('VALID');
    expect(res.json().data.bookingStatus).toBe('CHECKED_IN');
    expect(res.json().data.passengerCount).toBe(1);

    const t = await prisma.ticket.findUnique({ where: { id: ticket.ticketId } });
    expect(t?.status).toBe('SCANNED');
    const b = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(b?.status).toBe('CHECKED_IN');
    const scan = await prisma.boardingScan.findFirst({ where: { tripId: trip.id, ticketId: ticket.ticketId } });
    expect(scan?.result).toBe('VALID');
  });
});

describe('POST /v1/driver/trips/:id/scan — duplicate', () => {
  it('DUPLICATE: second scan of same ticket returns 200 with original timestamp', async () => {
    const { token, trip, ticket } = await setupScanScene();
    const body = { qrPayload: ticket.wireFormat, scannedAt: new Date().toISOString() };
    await app.inject({ method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`, headers: { authorization: `Bearer ${token}` }, payload: body });
    const res = await app.inject({ method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`, headers: { authorization: `Bearer ${token}` }, payload: body });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.result).toBe('DUPLICATE');
    expect(res.json().data.originalScannedAt).toBeTruthy();
  });
});

describe('POST /v1/driver/trips/:id/scan — signature', () => {
  it('400 INVALID_SIGNATURE for tampered signature', async () => {
    const { token, trip, ticket } = await setupScanScene();
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`,
      headers: { authorization: `Bearer ${token}` },
      payload: { qrPayload: tamperSig(ticket.wireFormat), scannedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_SIGNATURE');
  });
});

describe('POST /v1/driver/trips/:id/scan — trip mismatch', () => {
  it('400 INVALID_TRIP when QR scheduleId != trip scheduleId', async () => {
    const { seed, token, trip, ticket } = await setupScanScene();
    const schedule2 = await prisma.schedule.create({
      data: {
        operatorId: seed.operatorId,
        busId: seed.bus.id,
        routeId: seed.route.id,
        departureTime: new Date(Date.now() + 7 * 3600_000),
        arrivalTime: new Date(Date.now() + 15 * 3600_000),
        fareAmountPaise: 45000n,
        status: 'PUBLISHED',
      },
    });
    await prisma.trip.update({ where: { id: trip.id }, data: { scheduleId: schedule2.id } });
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`,
      headers: { authorization: `Bearer ${token}` },
      payload: { qrPayload: ticket.wireFormat, scannedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_TRIP');
  });
});

describe('POST /v1/driver/trips/:id/scan — cancelled booking', () => {
  it('400 INVALID_BOOKING when booking is CANCELLED', async () => {
    const { token, trip, ticket, booking } = await setupScanScene();
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`,
      headers: { authorization: `Bearer ${token}` },
      payload: { qrPayload: ticket.wireFormat, scannedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_BOOKING');
  });
});
describe('POST /v1/driver/trips/:id/scan — manual entry', () => {
  it('VALID via manual entry with matching name', async () => {
    const { token, trip, booking } = await setupScanScene();
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        manualEntry: true,
        bookingReference: booking.bookingReference,
        primaryPassengerName: booking.passengers[0]!.name,
        scannedAt: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.result).toBe('VALID');
  });

  it('400 INVALID_BOOKING on manual name mismatch', async () => {
    const { token, trip, booking } = await setupScanScene();
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        manualEntry: true,
        bookingReference: booking.bookingReference,
        primaryPassengerName: 'Not A Real Name',
        scannedAt: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_BOOKING');
  });
});

describe('POST /v1/driver/trips/:id/scan — auth', () => {
  it('401 with no token', async () => {
    const { trip, ticket } = await setupScanScene();
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`,
      payload: { qrPayload: ticket.wireFormat, scannedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(401);
  });

  it('403 with passenger token', async () => {
    const { trip, ticket } = await setupScanScene();
    const p = await createPassenger();
    const { accessToken } = await issueSessionTokens({ userId: p.id, role: 'REGISTERED_PASSENGER', sessionId: newUuid() });
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { qrPayload: ticket.wireFormat, scannedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /v1/driver/trips/:id/scan — trip state', () => {
  it('SCHEDULED trip allows scan (buscon/05 §14.2)', async () => {
    const { token, trip, ticket } = await setupScanScene();
    await prisma.trip.update({ where: { id: trip.id }, data: { status: 'SCHEDULED', startedAt: null } });
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`,
      headers: { authorization: `Bearer ${token}` },
      payload: { qrPayload: ticket.wireFormat, scannedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.result).toBe('VALID');
  });

  it('CANCELLED trip returns 400 INVALID_TRIP', async () => {
    const { token, trip, ticket } = await setupScanScene();
    await prisma.trip.update({ where: { id: trip.id }, data: { status: 'CANCELLED' } });
    const res = await app.inject({
      method: 'POST', url: `/v1/driver/trips/${trip.id}/scan`,
      headers: { authorization: `Bearer ${token}` },
      payload: { qrPayload: ticket.wireFormat, scannedAt: new Date().toISOString() },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('INVALID_TRIP');
  });
});