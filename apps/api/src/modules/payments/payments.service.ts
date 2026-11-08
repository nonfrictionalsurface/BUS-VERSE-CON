import * as events from '../../realtime/events.js';
import { emitToBooking, emitToTopic } from '../../realtime/emit.js';
import { prisma } from '../../lib/prisma.js';
import { redis, keys } from '../../lib/redis.js';
import { hashBody, getCachedResponse, setCachedResponse, acquireIdempotencyLock, releaseIdempotencyLock } from '../../lib/idempotency.js';
import { razorpayAdapter } from '../../integrations/razorpay.js';
import { performPaymentCapturedTx } from '../webhooks/webhooks.handlers.js';
import { paymentErrors } from './payments.errors.js';
import * as repo from './payments.repository.js';
import { errors } from '../../lib/errors.js';
import type { PaymentStatus } from '../booking/booking.types.js';

const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

export interface PaymentDTO {
  paymentId: string;
  bookingId: string;
  status: PaymentStatus;
  amountPaise: number;
  currency: string;
  checkoutUrl: string | null;
  /** What the app needs to open Razorpay checkout. `mock` means development: confirm via the dev endpoint instead. */
  gateway: { provider: 'RAZORPAY'; keyId: string; orderId: string; mock: boolean } | null;
  expiresAt: string;
}

export async function initiatePayment(
  userId: string,
  body: { bookingId: string; method?: string | undefined },
  idempotencyKey: string,
): Promise<PaymentDTO> {
  const bodyHash = hashBody(body);

  const cached = await getCachedResponse(idempotencyKey);
  if (cached) {
    if (cached.bodyHash !== bodyHash) throw paymentErrors.idempotencyReused();
    return cached.payload as PaymentDTO;
  }
  const lockAcquired = await acquireIdempotencyLock(idempotencyKey);
  if (!lockAcquired) {
    await new Promise((r) => setTimeout(r, 100));
    const retry = await getCachedResponse(idempotencyKey);
    if (retry && retry.bodyHash === bodyHash) return retry.payload as PaymentDTO;
    throw paymentErrors.idempotencyReused();
  }
  try {
    const booking = await repo.findBookingForPayment(body.bookingId, userId);
    if (!booking) throw paymentErrors.notFound();
    if (['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'REFUNDED'].includes(booking.status)) throw paymentErrors.alreadySucceeded();
    if (booking.status !== 'PENDING') throw paymentErrors.notAllowed(booking.status);

    const expiresAt = new Date(booking.createdAt.getTime() + PAYMENT_WINDOW_MS);
    if (expiresAt.getTime() < Date.now()) throw paymentErrors.notAllowed(booking.status);

    const order = await razorpayAdapter.createOrder({
      amountPaise: booking.totalFareAmount,
      receipt: booking.id,
      notes: { bookingId: booking.id },
    });

    const row = await repo.createPaymentRow({
      bookingId: booking.id,
      idempotencyKey,
      method: body.method ?? null,
      amountPaise: booking.totalFareAmount,
      currency: booking.totalFareCurrency,
      gatewayOrderId: order.orderId,
    });

    const result: PaymentDTO = {
      paymentId: row.id,
      bookingId: booking.id,
      status: row.status as PaymentStatus,
      amountPaise: Number(row.amountPaise),
      currency: row.currency,
      checkoutUrl: order.checkoutUrl,
      gateway: { provider: 'RAZORPAY', keyId: order.keyId, orderId: order.orderId, mock: order.mock },
      expiresAt: expiresAt.toISOString(),
    };
    await setCachedResponse(idempotencyKey, bodyHash, 201, result);
    return result;
  } finally {
    await releaseIdempotencyLock(idempotencyKey);
  }
}

export async function getPaymentStatus(userId: string, paymentId: string): Promise<PaymentDTO> {
  const payment = await repo.findPaymentForUser(paymentId, userId);
  if (!payment) throw paymentErrors.notFound();
  const expiresAt = new Date(payment.booking.createdAt.getTime() + PAYMENT_WINDOW_MS);
  return {
    paymentId: payment.id,
    bookingId: payment.bookingId,
    status: payment.status as PaymentStatus,
    amountPaise: Number(payment.amountPaise),
    currency: payment.currency,
    checkoutUrl: null,
    gateway: null,
    expiresAt: expiresAt.toISOString(),
  };
}
export interface MockConfirmResultDTO {
  paymentId: string;
  bookingId: string;
  ticketId: string;
  status: 'SUCCEEDED';
}

/**
 * Dev/test-only: simulates the Razorpay `payment.captured` webhook transaction.
 * Runs the full money-path per 06 §3.5: payment SUCCEEDED → booking CONFIRMED → ticket ISSUED
 * → gst_invoice issued → seat_locks deleted. Idempotent — if already SUCCEEDED, returns existing ticket.
 */
export async function mockConfirmPayment(paymentId: string, userId: string): Promise<MockConfirmResultDTO> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, deletedAt: null },
    include: {
      booking: {
        include: {
          passengers: { where: { deletedAt: null }, include: { seat: true } },
          schedule: { include: { bus: { include: { operator: true } } } },
        },
      },
    },
  });
  if (!payment) throw paymentErrors.notFound();
  if (payment.booking.userId !== userId) throw paymentErrors.notFound();

  if (payment.status === 'SUCCEEDED') {
    const existing = await prisma.ticket.findUnique({ where: { bookingId: payment.bookingId } });
    if (existing) return { paymentId: payment.id, bookingId: payment.bookingId, ticketId: existing.id, status: 'SUCCEEDED' };
  }
  if (payment.status !== 'INITIATED' && payment.status !== 'PENDING') {
    throw errors.paymentNotAllowed(payment.status);
  }
  if (payment.booking.status === 'EXPIRED' || payment.booking.status === 'FAILED' || payment.booking.status === 'CANCELLED') {
    throw errors.paymentNotAllowed(payment.booking.status);
  }

  const seatIds = payment.booking.passengers.map((p) => p.seatId);
  const result = await prisma.$transaction(
    (tx) => performPaymentCapturedTx(tx, payment, userId),
    { timeout: 30000, maxWait: 10000 },
  );

  for (const seatId of seatIds) {
    await redis.del(keys.seatLock(payment.booking.scheduleId, seatId)).catch(() => {});
  }
  emitToBooking(payment.bookingId, events.paymentSucceeded({
    paymentId: payment.id,
    bookingId: payment.bookingId,
    method: (payment.method as unknown as events.PaymentMethod | null) ?? null,
  }));
  emitToBooking(payment.bookingId, events.bookingConfirmed({
    bookingId: payment.bookingId,
    ticketId: result.ticketId,
    totalFarePaise: Number(payment.booking.totalFareAmount),
  }));
  for (const seatId of seatIds) {
    emitToTopic(`seat:availability:${payment.booking.scheduleId}`, events.seatBooked({
      seatId,
      bookingId: payment.bookingId,
    }));
  }

  return { paymentId: payment.id, bookingId: payment.bookingId, ticketId: result.ticketId, status: 'SUCCEEDED' };
}