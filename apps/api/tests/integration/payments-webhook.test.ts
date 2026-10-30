import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { registerMiddleware } from '../../src/middleware/index.js';
import { registerNotFoundHandler } from '../../src/routes/not-found.js';
import { registerErrorHandler } from '../../src/routes/error-handler.js';
import { bookingRouter } from '../../src/modules/booking/booking.router.js';
import { paymentsRouter } from '../../src/modules/payments/payments.router.js';
import { webhooksRouter } from '../../src/modules/webhooks/webhooks.router.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createPassenger } from '../helpers/factories.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { loginAsPassenger } from '../helpers/auth.js';
import { prisma } from '../../src/lib/prisma.js';
import { newUuid } from '../../src/lib/ids.js';

const SECRET = 'test_webhook_secret';

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ trustProxy: true, logger: false });
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    (req as { rawBody?: Buffer }).rawBody = body as Buffer;
    try { done(null, JSON.parse((body as Buffer).toString('utf8'))); }
    catch (e) { done(e as Error, undefined); }
  });
  await registerMiddleware(app);
  await app.register(bookingRouter, { prefix: '/v1' });
  await app.register(paymentsRouter, { prefix: '/v1' });
  await app.register(webhooksRouter, { prefix: '/v1' });
  await registerNotFoundHandler(app);
  await registerErrorHandler(app);
  await app.ready();
});

afterAll(async () => { await app.close(); });
beforeEach(async () => { await resetIdentityTables(); });

function sign(rawBody: string): string {
  return crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
}

async function setupPendingPayment(): Promise<{
  paymentId: string;
  gatewayOrderId: string;
  bookingId: string;
  scheduleId: string;
}> {
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
  const auth = { authorization: `Bearer ${token}` };
  const seat = seed.seats[0]!;
  const lock = await app.inject({ method: 'POST', url: '/v1/passenger/seat-locks', headers: auth,
    payload: { scheduleId: seed.schedule.id, seatId: seat.id } });
  const lockId = lock.json().data.lockId;
  const book = await app.inject({ method: 'POST', url: '/v1/passenger/bookings', headers: auth,
    payload: { lockId, boardingStandId: seed.stand1.id, droppingStandId: seed.stand2.id,
      passengers: [{ seatId: seat.id, name: 'Alice' }] } });
  const bookingId = book.json().data.bookingId;
  const pay = await app.inject({ method: 'POST', url: '/v1/passenger/payments',
    headers: { ...auth, 'idempotency-key': newUuid() }, payload: { bookingId } });
  const paymentId = pay.json().data.paymentId as string;
  const row = await prisma.payment.findUnique({ where: { id: paymentId } });
  return { paymentId, gatewayOrderId: row!.gatewayOrderId!, bookingId, scheduleId: seed.schedule.id };
}

function buildPayload(event: string, orderId: string, paymentId: string): string {
  return JSON.stringify({
    event,
    payload: {
      payment: {
        entity: { id: paymentId, order_id: orderId, amount: 48750, currency: 'INR', status: 'captured', method: 'upi' },
      },
    },
  });
}
describe('POST /v1/webhooks/razorpay', () => {
  it('valid signature flips payment SUCCEEDED, booking CONFIRMED, ticket + invoice + lock cleanup', async () => {
    const { gatewayOrderId, bookingId, scheduleId } = await setupPendingPayment();
    const body = buildPayload('payment.captured', gatewayOrderId, 'pay_' + newUuid().slice(0, 8));
    const sig = sign(body);
    const res = await app.inject({ method: 'POST', url: '/v1/webhooks/razorpay',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig }, payload: body });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('processed');
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking!.status).toBe('CONFIRMED');
    expect(await prisma.ticket.findFirst({ where: { bookingId } })).not.toBeNull();
    expect(await prisma.gstInvoice.findFirst({ where: { bookingId } })).not.toBeNull();
    expect(await prisma.seatLock.count({ where: { scheduleId } })).toBe(0);
  });

  it('invalid signature returns 401 UNAUTHORIZED', async () => {
    const { gatewayOrderId } = await setupPendingPayment();
    const body = buildPayload('payment.captured', gatewayOrderId, 'pay_x');
    const res = await app.inject({ method: 'POST', url: '/v1/webhooks/razorpay',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': 'deadbeef' }, payload: body });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('missing signature header returns 401', async () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: {} });
    const res = await app.inject({ method: 'POST', url: '/v1/webhooks/razorpay',
      headers: { 'content-type': 'application/json' }, payload: body });
    expect(res.statusCode).toBe(401);
  });

  it('duplicate identical payload returns 200 duplicate', async () => {
    const { gatewayOrderId } = await setupPendingPayment();
    const body = buildPayload('payment.captured', gatewayOrderId, 'pay_' + newUuid().slice(0, 8));
    const sig = sign(body);
    const headers = { 'content-type': 'application/json', 'x-razorpay-signature': sig };
    const r1 = await app.inject({ method: 'POST', url: '/v1/webhooks/razorpay', headers, payload: body });
    expect(r1.statusCode).toBe(200);
    const r2 = await app.inject({ method: 'POST', url: '/v1/webhooks/razorpay', headers, payload: body });
    expect(r2.statusCode).toBe(200);
    expect(r2.json().data.status).toBe('duplicate');
  });

  it('unknown event returns 200 ignored', async () => {
    const { gatewayOrderId } = await setupPendingPayment();
    const body = JSON.stringify({ event: 'refund.created', payload: {} });
    const sig = sign(body);
    const res = await app.inject({ method: 'POST', url: '/v1/webhooks/razorpay',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig }, payload: body });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('ignored');
  });

  it('payment.failed flips payment FAILED and booking FAILED', async () => {
    const { gatewayOrderId, bookingId } = await setupPendingPayment();
    const body = buildPayload('payment.failed', gatewayOrderId, 'pay_' + newUuid().slice(0, 8));
    const sig = sign(body);
    const res = await app.inject({ method: 'POST', url: '/v1/webhooks/razorpay',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig }, payload: body });
    expect(res.statusCode).toBe(200);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking!.status).toBe('FAILED');
  });

  it('webhook for unknown payment returns 200 ignored', async () => {
    const body = buildPayload('payment.captured', 'nonexistent_order', 'pay_unknown');
    const sig = sign(body);
    const res = await app.inject({ method: 'POST', url: '/v1/webhooks/razorpay',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig }, payload: body });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('ignored');
  });

  it('invoice_number matches FY format INV/YYYY-YY/NNNNN', async () => {
    const { gatewayOrderId, bookingId } = await setupPendingPayment();
    const body = buildPayload('payment.captured', gatewayOrderId, 'pay_' + newUuid().slice(0, 8));
    const sig = sign(body);
    await app.inject({ method: 'POST', url: '/v1/webhooks/razorpay',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig }, payload: body });
    const invoice = await prisma.gstInvoice.findFirst({ where: { bookingId } });
    expect(invoice!.invoiceNumber).toMatch(/^INV\/\d{4}-\d{2}\/\d{5}$/);
  });

  it('second captured event on terminal payment returns duplicate no-op', async () => {
    const { gatewayOrderId } = await setupPendingPayment();
    const p1 = buildPayload('payment.captured', gatewayOrderId, 'pay_' + newUuid().slice(0, 8));
    await app.inject({ method: 'POST', url: '/v1/webhooks/razorpay',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': sign(p1) }, payload: p1 });
    const p2 = buildPayload('payment.captured', gatewayOrderId, 'pay_' + newUuid().slice(0, 8));
    const r = await app.inject({ method: 'POST', url: '/v1/webhooks/razorpay',
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': sign(p2) }, payload: p2 });
    expect(r.statusCode).toBe(200);
    expect(r.json().data.status).toBe('duplicate');
  });
});