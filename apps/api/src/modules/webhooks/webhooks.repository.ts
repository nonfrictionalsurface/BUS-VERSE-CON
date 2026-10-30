import { prisma } from '../../lib/prisma.js';

const paymentInclude = {
  booking: {
    include: {
      passengers: { where: { deletedAt: null }, include: { seat: true } },
      schedule: { include: { bus: { include: { operator: true } } } },
    },
  },
} as const;

export async function findPaymentByGatewayIds(params: {
  razorpayOrderId: string | null;
  razorpayPaymentId: string;
}) {
  if (params.razorpayOrderId) {
    const byOrder = await prisma.payment.findFirst({
      where: { gatewayOrderId: params.razorpayOrderId, deletedAt: null },
      include: paymentInclude,
    });
    if (byOrder) return byOrder;
  }
  return prisma.payment.findFirst({
    where: { gatewayPaymentId: params.razorpayPaymentId, deletedAt: null },
    include: paymentInclude,
  });
}

export async function findRefundByPaymentId(paymentId: string) {
  return prisma.refund.findFirst({
    where: { paymentId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}