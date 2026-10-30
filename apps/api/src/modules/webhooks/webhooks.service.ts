import * as events from '../../realtime/events.js';
import { emitToBooking, emitToTopic } from '../../realtime/emit.js';
import { createHash } from 'node:crypto';
import { logger } from '../../lib/logger.js';
import { razorpayAdapter } from '../../integrations/razorpay.js';
import { writeFallback } from '../../lib/webhook-fallback.js';
import { razorpayWebhookSchema } from './webhooks.schema.js';
import { webhookErrors } from './webhooks.errors.js';
import type { RazorpayWebhookPayload, WebhookProcessResult } from './webhooks.types.js';

export const WEBHOOK_TX_OPTS = { timeout: 30000, maxWait: 10000 } as const;

export async function handleRazorpayWebhook(
  rawBody: Buffer,
  signature: string,
  opts: { isReplay?: boolean } = {},
): Promise<WebhookProcessResult> {
  if (!razorpayAdapter.verifyWebhookSignature(rawBody, signature)) {
    throw webhookErrors.invalidSignature();
  }

  let body: RazorpayWebhookPayload;
  try {
    body = razorpayWebhookSchema.parse(JSON.parse(rawBody.toString('utf8'))) as RazorpayWebhookPayload;
  } catch (err) {
    if (opts.isReplay) throw err;
    logger.warn({ err }, 'webhook schema parse failed');
    throw webhookErrors.invalidPayload();
  }

  const payloadHash = createHash('sha256').update(rawBody).digest('hex');

  try {
    return await dispatch(body, rawBody, payloadHash);
  } catch (err) {
    // 09 §13.5: DB error → local file fallback, 200 to Razorpay, replay job retries
    logger.error({ err, event: body.event }, 'webhook DB error — writing fallback');
    await writeFallback(rawBody, { event: body.event, reason: (err as Error).message, signature });
    return { status: 'processed', eventType: body.event };
  }
}

async function dispatch(
  body: RazorpayWebhookPayload,
  rawBody: Buffer,
  payloadHash: string,
): Promise<WebhookProcessResult> {
  if (body.event === 'payment.captured') return handlePaymentCaptured(body, rawBody, payloadHash);
  if (body.event === 'payment.failed') return handlePaymentFailed(body, rawBody, payloadHash);
  if (body.event === 'refund.processed') return handleRefundProcessed(body, rawBody, payloadHash);
  return { status: 'ignored', eventType: body.event };
}
import { prisma } from '../../lib/prisma.js';
import { redis, keys } from '../../lib/redis.js';
import * as repo from './webhooks.repository.js';
import { performPaymentCapturedTx, performPaymentFailedTx, performRefundProcessedTx } from './webhooks.handlers.js';

async function handlePaymentCaptured(
  body: RazorpayWebhookPayload,
  rawBody: Buffer,
  payloadHash: string,
): Promise<WebhookProcessResult> {
  const ent = body.payload.payment!.entity;
  const payment = await repo.findPaymentByGatewayIds({
    razorpayOrderId: ent.order_id ?? null,
    razorpayPaymentId: ent.id,
  });
  if (!payment) return { status: 'ignored', eventType: body.event };

  const result = await prisma.$transaction(async (tx) => {
    try {
      await tx.gatewayWebhook.create({
        data: {
          paymentId: payment.id,
          eventType: 'payment.captured',
          payloadHash,
          payloadJson: body as never,
          signature: 'verified',
          isTest: payment.isTest,
        },
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return { kind: 'duplicate' as const };
      throw e;
    }
    if (payment.status === 'SUCCEEDED') return { kind: 'duplicate' as const };
    await tx.payment.update({ where: { id: payment.id }, data: { gatewayPaymentId: ent.id, method: ent.method ?? null } });
    const r = await performPaymentCapturedTx(tx, payment, null);
    return { kind: 'processed' as const, ticketId: r.ticketId };
  }, WEBHOOK_TX_OPTS);

  if (result.kind === 'processed') {
    for (const seatId of payment.booking.passengers.map((p) => p.seatId)) {
      await redis.del(keys.seatLock(payment.booking.scheduleId, seatId)).catch(() => {});
      emitToTopic(`seat:availability:${payment.booking.scheduleId}`, events.seatBooked({
        seatId,
        bookingId: payment.bookingId,
      }));
    }
    const __fb = payment.booking.fareBreakdownJson as { total_paise?: number };
    emitToBooking(payment.bookingId, events.paymentSucceeded({
      paymentId: payment.id,
      bookingId: payment.bookingId,
      method: (ent.method as unknown as events.PaymentMethod | null) ?? null,
    }));
    emitToBooking(payment.bookingId, events.bookingConfirmed({
      bookingId: payment.bookingId,
      ticketId: result.ticketId,
      totalFarePaise: __fb.total_paise ?? 0,
    }));
  }
  return { status: result.kind, eventType: body.event, paymentId: payment.id };
}

async function handlePaymentFailed(
  body: RazorpayWebhookPayload,
  rawBody: Buffer,
  payloadHash: string,
): Promise<WebhookProcessResult> {
  const ent = body.payload.payment!.entity;
  const payment = await repo.findPaymentByGatewayIds({
    razorpayOrderId: ent.order_id ?? null,
    razorpayPaymentId: ent.id,
  });
  if (!payment) return { status: 'ignored', eventType: body.event };

  const result = await prisma.$transaction(async (tx) => {
    try {
      await tx.gatewayWebhook.create({
        data: {
          paymentId: payment.id,
          eventType: 'payment.failed',
          payloadHash,
          payloadJson: body as never,
          signature: 'verified',
          isTest: payment.isTest,
        },
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return { kind: 'duplicate' as const };
      throw e;
    }
    if (payment.status === 'FAILED') return { kind: 'duplicate' as const };
    await tx.payment.update({ where: { id: payment.id }, data: { gatewayPaymentId: ent.id } });
    await performPaymentFailedTx(tx, payment, null);
    return { kind: 'processed' as const };
  }, WEBHOOK_TX_OPTS);

  return { status: result.kind, eventType: body.event, paymentId: payment.id };
}
async function handleRefundProcessed(
  body: RazorpayWebhookPayload,
  rawBody: Buffer,
  payloadHash: string,
): Promise<WebhookProcessResult> {
  const ent = body.payload.refund!.entity;
  const payment = await repo.findPaymentByGatewayIds({
    razorpayOrderId: null,
    razorpayPaymentId: ent.payment_id,
  });
  if (!payment) return { status: 'ignored', eventType: body.event };
  const refund = await repo.findRefundByPaymentId(payment.id);
  if (!refund) return { status: 'ignored', eventType: body.event };

  const result = await prisma.$transaction(async (tx) => {
    try {
      await tx.gatewayWebhook.create({
        data: {
          paymentId: payment.id,
          eventType: 'refund.processed',
          payloadHash,
          payloadJson: body as never,
          signature: 'verified',
          isTest: payment.isTest,
        },
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') return { kind: 'duplicate' as const };
      throw e;
    }
    if (refund.status === 'PROCESSED') return { kind: 'duplicate' as const };
    await tx.refund.update({ where: { id: refund.id }, data: { gatewayRefundId: ent.id } });
    await performRefundProcessedTx(tx, refund.id, null);
    return { kind: 'processed' as const };
  }, WEBHOOK_TX_OPTS);

  return { status: result.kind, eventType: body.event, paymentId: payment.id };
}

export { handlePaymentCaptured, handlePaymentFailed, handleRefundProcessed };