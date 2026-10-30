import { prisma } from '../../lib/prisma.js';

export async function findBookingForPayment(bookingId: string, userId: string) {
  return prisma.booking.findFirst({
    where: { id: bookingId, userId, deletedAt: null },
    select: {
      id: true,
      status: true,
      createdAt: true,
      totalFareAmount: true,
      totalFareCurrency: true,
      scheduleId: true,
    },
  });
}

export async function createPaymentRow(params: {
  bookingId: string;
  idempotencyKey: string;
  method: string | null;
  amountPaise: bigint;
  currency: string;
  gatewayOrderId: string;
}) {
  return prisma.payment.create({
    data: {
      bookingId: params.bookingId,
      idempotencyKey: params.idempotencyKey,
      gateway: 'RAZORPAY',
      method: params.method,
      amountPaise: params.amountPaise,
      currency: params.currency,
      status: 'INITIATED',
      gatewayOrderId: params.gatewayOrderId,
    },
    select: { id: true, status: true, amountPaise: true, currency: true },
  });
}

export async function findPaymentForUser(paymentId: string, userId: string) {
  return prisma.payment.findFirst({
    where: { id: paymentId, deletedAt: null, booking: { userId, deletedAt: null } },
    select: {
      id: true,
      bookingId: true,
      status: true,
      amountPaise: true,
      currency: true,
      initiatedAt: true,
      succeededAt: true,
      booking: { select: { status: true, createdAt: true } },
    },
  });
}