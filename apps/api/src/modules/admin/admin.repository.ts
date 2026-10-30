import { prisma } from '../../lib/prisma.js';

// ---------- Operators ----------

export async function listOperators(params: { status?: string | undefined; limit: number }) {
  const ops = await prisma.operator.findMany({
    where: { deletedAt: null, ...(params.status ? { status: params.status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: params.limit,
  });
  return attachOperatorCounts(ops);
}

export async function findOperatorById(id: string) {
  const op = await prisma.operator.findFirst({ where: { id, deletedAt: null } });
  if (!op) return null;
  const [withCounts] = await attachOperatorCounts([op]);
  return withCounts ?? null;
}

export async function updateOperatorStatus(id: string, status: string) {
  return prisma.operator.update({ where: { id }, data: { status } });
}

export async function findOperatorUserIdsForOperator(operatorId: string): Promise<string[]> {
  const rows = await prisma.operatorUser.findMany({
    where: { operatorId, deletedAt: null },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

async function attachOperatorCounts<
  T extends { id: string; companyName: string; gstin: string; pan: string; status: string; bankAccountRef: string | null; createdAt: Date; updatedAt: Date },
>(ops: T[]) {
  if (ops.length === 0) return [] as Array<{ operator: T; counts: { busCount: number; driverCount: number; operatorUserCount: number } }>;
  const ids = ops.map((o) => o.id);
  const [busCounts, driverCounts, opUserCounts] = await Promise.all([
    prisma.bus.groupBy({ by: ['operatorId'], where: { operatorId: { in: ids }, deletedAt: null }, _count: { _all: true } }),
    prisma.driverProfile.groupBy({ by: ['operatorId'], where: { operatorId: { in: ids }, deletedAt: null }, _count: { _all: true } }),
    prisma.operatorUser.groupBy({ by: ['operatorId'], where: { operatorId: { in: ids }, deletedAt: null }, _count: { _all: true } }),
  ]);
  const busMap = new Map(busCounts.map((r) => [r.operatorId, r._count._all]));
  const driverMap = new Map(driverCounts.map((r) => [r.operatorId, r._count._all]));
  const opUserMap = new Map(opUserCounts.map((r) => [r.operatorId, r._count._all]));
  return ops.map((operator) => ({
    operator,
    counts: {
      busCount: busMap.get(operator.id) ?? 0,
      driverCount: driverMap.get(operator.id) ?? 0,
      operatorUserCount: opUserMap.get(operator.id) ?? 0,
    },
  }));
}

// ---------- Buses ----------

export async function listBuses(params: { status?: string | undefined; operatorId?: string | undefined; limit: number }) {
  return prisma.bus.findMany({
    where: {
      deletedAt: null,
      ...(params.status ? { approvalStatus: params.status } : {}),
      ...(params.operatorId ? { operatorId: params.operatorId } : {}),
    },
    include: { operator: true },
    orderBy: { createdAt: 'desc' },
    take: params.limit,
  });
}

export async function findBusById(id: string) {
  return prisma.bus.findFirst({
    where: { id, deletedAt: null },
    include: { operator: true },
  });
}

export async function updateBusApprovalStatus(id: string, status: string) {
  return prisma.bus.update({ where: { id }, data: { approvalStatus: status } });
}

// ---------- Routes ----------

export async function listRoutes(params: { status?: string | undefined; operatorId?: string | undefined; limit: number }) {
  const routes = await prisma.route.findMany({
    where: {
      deletedAt: null,
      ...(params.status ? { approvalStatus: params.status } : {}),
      ...(params.operatorId ? { operatorId: params.operatorId } : {}),
    },
    include: { operator: true, originCity: true, destCity: true },
    orderBy: { createdAt: 'desc' },
    take: params.limit,
  });
  return attachRouteCounts(routes);
}

export async function findRouteById(id: string) {
  const r = await prisma.route.findFirst({
    where: { id, deletedAt: null },
    include: { operator: true, originCity: true, destCity: true },
  });
  if (!r) return null;
  const [withCounts] = await attachRouteCounts([r]);
  return withCounts ?? null;
}

export async function updateRouteApprovalStatus(id: string, status: string) {
  return prisma.route.update({ where: { id }, data: { approvalStatus: status } });
}

async function attachRouteCounts<T extends { id: string }>(routes: T[]) {
  if (routes.length === 0) return [] as Array<T & { _count: { stands: number } }>;
  const ids = routes.map((r) => r.id);
  const counts = await prisma.routeStand.groupBy({
    by: ['routeId'],
    where: { routeId: { in: ids } },
    _count: { _all: true },
  });
  const map = new Map(counts.map((r) => [r.routeId, r._count._all]));
  return routes.map((r) => ({ ...r, _count: { stands: map.get(r.id) ?? 0 } }));
}

// ---------- Schedules ----------

export async function listSchedules(params: { status?: string | undefined; operatorId?: string | undefined; limit: number }) {
  return prisma.schedule.findMany({
    where: {
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.operatorId ? { operatorId: params.operatorId } : {}),
    },
    include: {
      operator: true,
      bus: true,
      route: { include: { originCity: true, destCity: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: params.limit,
  });
}

export async function findScheduleById(id: string) {
  return prisma.schedule.findFirst({
    where: { id, deletedAt: null },
    include: {
      operator: true,
      bus: true,
      route: { include: { originCity: true, destCity: true } },
    },
  });
}

export async function updateScheduleStatus(id: string, status: string) {
  return prisma.schedule.update({ where: { id }, data: { status } });
}

// ---------- Bookings ----------

export async function listBookings(params: {
  status?: string | undefined;
  userId?: string | undefined;
  scheduleId?: string | undefined;
  operatorId?: string | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  limit: number;
}) {
  const scheduleFilter: Record<string, unknown> = { deletedAt: null };
  if (params.operatorId) scheduleFilter.operatorId = params.operatorId;
  if (params.from || params.to) {
    scheduleFilter.departureTime = {
      ...(params.from ? { gte: params.from } : {}),
      ...(params.to ? { lte: params.to } : {}),
    };
  }
  const rows = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.scheduleId ? { scheduleId: params.scheduleId } : {}),
      schedule: scheduleFilter,
    },
    include: {
      passengers: { where: { deletedAt: null } },
      schedule: {
        include: {
          operator: true,
          route: { include: { originCity: true, destCity: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: params.limit,
  });
  return rows;
}

export async function findBookingById(id: string) {
  return prisma.booking.findFirst({
    where: { id, deletedAt: null },
    include: {
      passengers: { where: { deletedAt: null } },
      schedule: {
        include: {
          operator: true,
          route: { include: { originCity: true, destCity: true } },
        },
      },
      boardingStand: true,
      droppingStand: true,
      user: true,
      payments: { where: { deletedAt: null } },
    },
  });
}

export async function fetchSeatLabels(seatIds: string[]): Promise<Map<string, string>> {
  if (seatIds.length === 0) return new Map();
  const rows = await prisma.seat.findMany({
    where: { id: { in: seatIds } },
    select: { id: true, seatLabel: true },
  });
  return new Map(rows.map((r) => [r.id, r.seatLabel]));
}

// ---------- Dashboard aggregates ----------

export async function getDashboardCounts() {
  const [
    opGrouped,
    busGrouped,
    routeGrouped,
    schedGrouped,
    bookGrouped,
    driverGrouped,
  ] = await Promise.all([
    prisma.operator.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.bus.groupBy({ by: ['approvalStatus'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.route.groupBy({ by: ['approvalStatus'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.schedule.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.booking.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.driverProfile.groupBy({ by: ['onDuty'], where: { deletedAt: null }, _count: { _all: true } }),
  ]);

  const operatorCounts: Record<string, number> = {};
  for (const row of opGrouped) operatorCounts[row.status] = row._count._all;

  const busTotal = busGrouped.reduce((s, r) => s + r._count._all, 0);
  const busPending = busGrouped.find((r) => r.approvalStatus === 'PENDING')?._count._all ?? 0;
  const busApproved = busGrouped.find((r) => r.approvalStatus === 'APPROVED')?._count._all ?? 0;

  const routeTotal = routeGrouped.reduce((s, r) => s + r._count._all, 0);
  const routePending = routeGrouped.find((r) => r.approvalStatus === 'PENDING')?._count._all ?? 0;

  const scheduleTotal = schedGrouped.reduce((s, r) => s + r._count._all, 0);
  const schedulePublished = schedGrouped.find((r) => r.status === 'PUBLISHED')?._count._all ?? 0;
  const scheduleDraft = schedGrouped.find((r) => r.status === 'DRAFT')?._count._all ?? 0;

  const bookingTotal = bookGrouped.reduce((s, r) => s + r._count._all, 0);
  const bookingConfirmed = bookGrouped.find((r) => r.status === 'CONFIRMED')?._count._all ?? 0;
  const bookingCancelled =
    (bookGrouped.find((r) => r.status === 'CANCELLED')?._count._all ?? 0) +
    (bookGrouped.find((r) => r.status === 'OPERATOR_CANCELLED')?._count._all ?? 0) +
    (bookGrouped.find((r) => r.status === 'REFUNDED')?._count._all ?? 0);

  const driverTotal = driverGrouped.reduce((s, r) => s + r._count._all, 0);
  const driverOnDuty = driverGrouped.find((r) => r.onDuty === true)?._count._all ?? 0;

  return {
    operatorCounts,
    busTotal, busPending, busApproved,
    routeTotal, routePending,
    scheduleTotal, schedulePublished, scheduleDraft,
    bookingTotal, bookingConfirmed, bookingCancelled,
    driverTotal, driverOnDuty,
  };
}

export async function countBookingsToday(from: Date, to: Date): Promise<number> {
  return prisma.booking.count({
    where: { deletedAt: null, createdAt: { gte: from, lte: to } },
  });
}

export async function sumRevenueToday(from: Date, to: Date): Promise<number> {
  const r = await prisma.payment.aggregate({
    where: { deletedAt: null, status: 'SUCCEEDED', succeededAt: { gte: from, lte: to } },
    _sum: { amountPaise: true },
  });
  return Number(r._sum.amountPaise ?? 0);
}

export async function sumRevenueLast7Days(from: Date, to: Date): Promise<number> {
  const r = await prisma.payment.aggregate({
    where: { deletedAt: null, status: 'SUCCEEDED', succeededAt: { gte: from, lte: to } },
    _sum: { amountPaise: true },
  });
  return Number(r._sum.amountPaise ?? 0);
}

export async function sumRevenueTotal(): Promise<number> {
  const r = await prisma.payment.aggregate({
    where: { deletedAt: null, status: 'SUCCEEDED' },
    _sum: { amountPaise: true },
  });
  return Number(r._sum.amountPaise ?? 0);
}
// ---------- Payments + refunds oversight (Phase 5) ----------

const PAYMENT_INCLUDE = {
  booking: {
    include: {
      schedule: { include: { operator: true } },
    },
  },
  refunds: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' as const } },
} as const;

export async function listPayments(p: {
  status?: string | undefined;
  bookingId?: string | undefined;
  operatorId?: string | undefined;
  limit: number;
}) {
  return prisma.payment.findMany({
    where: {
      deletedAt: null,
      ...(p.status ? { status: p.status } : {}),
      ...(p.bookingId ? { bookingId: p.bookingId } : {}),
      ...(p.operatorId ? { booking: { schedule: { operatorId: p.operatorId } } } : {}),
    },
    include: PAYMENT_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: p.limit,
  });
}

export async function findPaymentById(id: string) {
  return prisma.payment.findFirst({
    where: { id, deletedAt: null },
    include: PAYMENT_INCLUDE,
  });
}

export async function countWebhooksForPayment(paymentId: string) {
  return prisma.gatewayWebhook.count({ where: { paymentId } });
}

export async function listRefunds(p: {
  status?: string | undefined;
  paymentId?: string | undefined;
  limit: number;
}) {
  return prisma.refund.findMany({
    where: {
      deletedAt: null,
      ...(p.status ? { status: p.status } : {}),
      ...(p.paymentId ? { paymentId: p.paymentId } : {}),
    },
    include: {
      payment: {
        include: {
          booking: { select: { id: true, bookingReference: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: p.limit,
  });
}