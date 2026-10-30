import type { Prisma } from '@prisma/client';
import { writeAuditEvent } from '../../lib/audit.js';
import { issueTicket } from '../booking/ticket.service.js';
import { nextInvoiceNumber } from '../booking/booking.service.js';
import { withAdvisoryLock } from '../../lib/advisory-lock.js';

export type PaymentWithBooking = {
  id: string;
  bookingId: string;
  isTest: boolean;
  booking: {
    userId: string;
    scheduleId: string;
    boardingStandId: string;
    fareBreakdownJson: Prisma.JsonValue;
    schedule: { bus: { operator: { gstin: string } } };
    passengers: Array<{ seatId: string; name: string; seat: { seatLabel: string } }>;
  };
};

/**
 * 7-step payment.captured transaction (06 v1.2 §3.5).
 * Extracted from mockConfirmPayment so mock + real webhook share one path.
 * pg_advisory_lock around nextInvoiceNumber (A2).
 */
export async function performPaymentCapturedTx(
  tx: Prisma.TransactionClient,
  payment: PaymentWithBooking,
  actorId: string | null,
): Promise<{ ticketId: string }> {
  const seatIds = payment.booking.passengers.map((p) => p.seatId);
  const fb = payment.booking.fareBreakdownJson as { base_fare_paise?: number; tax_paise?: number };

  await tx.payment.update({ where: { id: payment.id }, data: { status: 'SUCCEEDED', succeededAt: new Date() } });
  await tx.booking.update({ where: { id: payment.bookingId }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });

  const ticketResult = await issueTicket(tx, {
    bookingId: payment.bookingId,
    scheduleId: payment.booking.scheduleId,
    boardingStandId: payment.booking.boardingStandId,
    passengers: payment.booking.passengers.map((p) => ({ seatId: p.seatId, seatLabel: p.seat.seatLabel, name: p.name })),
  });

  const invoiceNumber = await withAdvisoryLock(tx, `gst_invoice_${payment.bookingId}`, async () => nextInvoiceNumber(tx));
  await tx.gstInvoice.create({
    data: {
      bookingId: payment.bookingId,
      invoiceNumber,
      gstin: payment.booking.schedule.bus.operator.gstin,
      taxableValuePaise: BigInt(fb.base_fare_paise ?? 0),
      gstAmountPaise: BigInt(fb.tax_paise ?? 0),
    },
  });

  await tx.seatLock.deleteMany({ where: { scheduleId: payment.booking.scheduleId, seatId: { in: seatIds } } });

  await writeAuditEvent({
    tx, actorId, sessionId: null,
    entityType: 'Payment', entityId: payment.id,
    action: 'payment_succeeded',
    metadata: { bookingId: payment.bookingId, ticketId: ticketResult.ticketId },
  });

  return { ticketId: ticketResult.ticketId };
}
export async function performPaymentFailedTx(
  tx: Prisma.TransactionClient,
  payment: PaymentWithBooking,
  actorId: string | null,
): Promise<void> {
  const seatIds = payment.booking.passengers.map((p) => p.seatId);
  await tx.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failedAt: new Date() } });
  await tx.booking.update({ where: { id: payment.bookingId }, data: { status: 'FAILED' } });
  await tx.seatLock.deleteMany({ where: { scheduleId: payment.booking.scheduleId, seatId: { in: seatIds } } });
  await writeAuditEvent({
    tx, actorId, sessionId: null,
    entityType: 'Payment', entityId: payment.id,
    action: 'payment_failed',
    metadata: { bookingId: payment.bookingId },
  });
}

export async function performRefundProcessedTx(
  tx: Prisma.TransactionClient,
  refundId: string,
  actorId: string | null,
): Promise<void> {
  const r = await tx.refund.update({
    where: { id: refundId },
    data: { status: 'PROCESSED', processedAt: new Date() },
  });
  const p = await tx.payment.update({ where: { id: r.paymentId }, data: { status: 'REFUNDED' } });
  await tx.booking.update({ where: { id: p.bookingId }, data: { status: 'REFUNDED' } });
  await writeAuditEvent({
    tx, actorId, sessionId: null,
    entityType: 'Refund', entityId: refundId,
    action: 'refund_processed',
    metadata: { paymentId: r.paymentId, bookingId: p.bookingId, amountPaise: Number(r.amountPaise) },
  });
}