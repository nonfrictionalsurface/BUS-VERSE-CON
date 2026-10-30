import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { bookingRouter } from '../../src/modules/booking/booking.router.js';
import { paymentsRouter } from '../../src/modules/payments/payments.router.js';
import { devRouter } from '../../src/modules/payments/dev.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createPassenger } from '../helpers/factories.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { loginAsPassenger } from '../helpers/auth.js';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';
import { issueSessionTokens } from '../../src/modules/identity/jwt.service.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  await registerMiddleware(app);
  await app.register(bookingRouter, { prefix: '/v1' });
  await app.register(paymentsRouter, { prefix: '/v1' });
  await app.register(devRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});

afterAll(async () => { await app.close(); });

beforeEach(async () => { await resetIdentityTables(); });

async function scenario() {
  const seed = await seedBookingScenario({ bookingCount: 0 });
  await prisma.schedule.update({
    where: { id: seed.schedule.id },
    data: {
      departureTime: new Date(Date.now() + 2 * 3_600_000),
      arrivalTime: new Date(Date.now() + 10 * 3_600_000),
    },
  });
  const user = await createPassenger();
  const token = await loginAsPassenger(user.id);
  return { seed, user, token };
}

async function completeBookingFlow(token: string, seed: any) {
  const auth = { authorization: `Bearer ${token}` };
  const seat = seed.seats[0]!;
  const lock = await app.inject({
    method: 'POST', url: '/v1/passenger/seat-locks', headers: auth,
    payload: { scheduleId: seed.schedule.id, seatId: seat.id },
  });
  const lockId = lock.json().data.lockId;
  const book = await app.inject({
    method: 'POST', url: '/v1/passenger/bookings', headers: auth,
    payload: {
      lockId, boardingStandId: seed.stand1.id, droppingStandId: seed.stand2.id,
      passengers: [{ seatId: seat.id, name: 'Alice Gupta' }],
    },
  });
  const bookingId = book.json().data.bookingId;
  const idem = newUuid();
  const pay = await app.inject({
    method: 'POST', url: '/v1/passenger/payments', headers: { ...auth, 'idempotency-key': idem },
    payload: { bookingId, method: 'UPI' },
  });
  const paymentId = pay.json().data.paymentId;
  const confirm = await app.inject({
    method: 'POST', url: '/v1/dev/mock-confirm-payment', headers: auth,
    payload: { paymentId },
  });
  return { bookingId, paymentId, confirmRes: confirm, lockId, seat };
}
describe('RBAC gates', () => {
  it('no token → 401 on GET /passenger/bookings', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/passenger/bookings' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('operator-role token → 403 on passenger endpoint', async () => {
    const user = await createPassenger();
    const { accessToken } = await issueSessionTokens({
      userId: user.id,
      role: 'OPERATOR_OWNER',
      sessionId: newUuid(),
    });
    const res = await app.inject({
      method: 'GET', url: '/v1/passenger/bookings',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });

  it('passenger token → 200 with empty data', async () => {
    const user = await createPassenger();
    const token = await loginAsPassenger(user.id);
    const res = await app.inject({
      method: 'GET', url: '/v1/passenger/bookings',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });
});
describe('Happy path — full HTTP flow', () => {
  it('availability → lock → book → pay → mock-confirm → ticket', async () => {
    const { seed, token } = await scenario();
    const auth = { authorization: `Bearer ${token}` };
    const seat = seed.seats[0]!;

    const avail = await app.inject({
      method: 'GET',
      url: `/v1/passenger/schedules/${seed.schedule.id}/availability`,
      headers: auth,
    });
    expect(avail.statusCode).toBe(200);
    expect(avail.json().data.seats.length).toBeGreaterThan(0);
    expect(avail.json().data.seats[0].state).toBe('AVAILABLE');

    const { bookingId, paymentId, confirmRes, lockId } = await completeBookingFlow(token, seed);

    // Confirm response
    expect(confirmRes.statusCode).toBe(200);
    expect(confirmRes.json().data.status).toBe('SUCCEEDED');
    const ticketId = confirmRes.json().data.ticketId;
    expect(ticketId).toBeTruthy();
    expect(lockId).toBeTruthy();
    expect(paymentId).toBeTruthy();

    // Ticket fetch
    const ticket = await app.inject({
      method: 'GET',
      url: `/v1/passenger/bookings/${bookingId}/ticket`,
      headers: auth,
    });
    expect(ticket.statusCode).toBe(200);
    expect(ticket.json().data.ticketId).toBe(ticketId);
    expect(ticket.json().data.qrPayload).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);

    // Booking is CONFIRMED, seat is BOOKED
    const detail = await app.inject({
      method: 'GET',
      url: `/v1/passenger/bookings/${bookingId}`,
      headers: auth,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.status).toBe('CONFIRMED');

    const availAfter = await app.inject({
      method: 'GET',
      url: `/v1/passenger/schedules/${seed.schedule.id}/availability`,
      headers: auth,
    });
    const bookedSeat = availAfter.json().data.seats.find((s: any) => s.id === seat.id);
    expect(bookedSeat.state).toBe('BOOKED');
  });
});
describe('Refund preview + cancel', () => {
  it('TIER_FULL preview then cancel creates refund row', async () => {
    const { seed, token } = await scenario();
    const auth = { authorization: `Bearer ${token}` };
    const { bookingId } = await completeBookingFlow(token, seed);

    // Departure >24h → TIER_FULL
    await prisma.schedule.update({
      where: { id: seed.schedule.id },
      data: {
        departureTime: new Date(Date.now() + 25 * 3_600_000),
        arrivalTime: new Date(Date.now() + 33 * 3_600_000),
      },
    });

    const preview = await app.inject({
      method: 'GET',
      url: `/v1/passenger/bookings/${bookingId}/refund-preview`,
      headers: auth,
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().data.tier).toBe('TIER_FULL');
    expect(preview.json().data.totalRefundPaise).toBe(preview.json().data.totalPaidPaise);

    const cancel = await app.inject({
      method: 'POST',
      url: `/v1/passenger/bookings/${bookingId}/cancel`,
      headers: auth,
    });
    expect(cancel.statusCode).toBe(200);
    expect(cancel.json().data.status).toBe('CANCELLED');
    expect(cancel.json().data.refund.tier).toBe('TIER_FULL');

    const refund = await prisma.refund.findFirst({ where: { payment: { bookingId } } });
    expect(refund).not.toBeNull();
    expect(refund!.status).toBe('INITIATED');
    expect(refund!.refundTier).toBe('TIER_FULL');
  });
});

describe('Idempotency-Key', () => {
  it('same key + same body returns same paymentId (no duplicate row)', async () => {
    const { seed, token } = await scenario();
    const auth = { authorization: `Bearer ${token}` };
    const seat = seed.seats[0]!;

    const lock = await app.inject({
      method: 'POST', url: '/v1/passenger/seat-locks', headers: auth,
      payload: { scheduleId: seed.schedule.id, seatId: seat.id },
    });
    const lockId = lock.json().data.lockId;
    const book = await app.inject({
      method: 'POST', url: '/v1/passenger/bookings', headers: auth,
      payload: {
        lockId, boardingStandId: seed.stand1.id, droppingStandId: seed.stand2.id,
        passengers: [{ seatId: seat.id, name: 'Alice' }],
      },
    });
    const bookingId = book.json().data.bookingId;
    const idem = newUuid();

    const pay1 = await app.inject({
      method: 'POST', url: '/v1/passenger/payments', headers: { ...auth, 'idempotency-key': idem },
      payload: { bookingId },
    });
    expect(pay1.statusCode).toBe(201);
    const paymentId1 = pay1.json().data.paymentId;

    const pay2 = await app.inject({
      method: 'POST', url: '/v1/passenger/payments', headers: { ...auth, 'idempotency-key': idem },
      payload: { bookingId },
    });
    expect(pay2.json().data.paymentId).toBe(paymentId1);
    expect(await prisma.payment.count({ where: { bookingId } })).toBe(1);
  });
});