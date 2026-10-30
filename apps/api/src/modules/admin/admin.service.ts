import * as events from '../../realtime/events.js';
import { emitToTopic } from '../../realtime/emit.js';
import { prisma } from '../../lib/prisma.js';
import { errors } from '../../lib/errors.js';
import { writeAuditEvent } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import { razorpayAdapter } from '../../integrations/razorpay.js';
import * as repo from './admin.repository.js';
import {
  toAdminBookingDTO,
  toAdminDashboardDTO,
  toBusAdminDTO,
  toOperatorAdminDTO,
  toRouteAdminDTO,
  toScheduleAdminDTO,
} from './admin.mappers.js';
import type {
  AdminBookingDTO,
  AdminDashboardDTO,
  AdminPaymentDTO,
  AdminPaymentDetailDTO,
  AdminRefundDTO,
  BusAdminDTO,
  OperatorAdminDTO,
  RouteAdminDTO,
  ScheduleAdminDTO,
} from './admin.types.js';

export interface Actor {
  userId: string;
  sessionId: string;
  ip?: string | undefined;
}

// ---------- helpers ----------

function istDayBounds(dateStr: string): { from: Date; to: Date } {
  const from = new Date(`${dateStr}T00:00:00.000+05:30`);
  const to = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { from, to };
}

function todayIstDate(): string {
  const istNow = new Date(Date.now() + 5.5 * 3600 * 1000);
  return istNow.toISOString().slice(0, 10);
}

function assertOperatorTransition(current: string, next: 'APPROVED' | 'REJECTED' | 'SUSPENDED'): void {
  if (next === 'APPROVED' || next === 'REJECTED') {
    if (current !== 'APPLIED' && current !== 'PENDING_REVIEW') {
      throw errors.invalidTransition(`Cannot ${next === 'APPROVED' ? 'approve' : 'reject'} operator in status ${current}`);
    }
    return;
  }
  // next === 'SUSPENDED'
  if (current !== 'APPROVED' && current !== 'ACTIVE') {
    throw errors.invalidTransition(`Cannot suspend operator in status ${current}`);
  }
}

function assertBusTransition(current: string, next: 'APPROVED' | 'REJECTED'): void {
  if (current !== 'PENDING') {
    throw errors.invalidTransition(`Cannot ${next === 'APPROVED' ? 'approve' : 'reject'} bus in status ${current}`);
  }
}

function assertRouteTransition(current: string, next: 'APPROVED' | 'REJECTED'): void {
  if (current !== 'PENDING') {
    throw errors.invalidTransition(`Cannot ${next === 'APPROVED' ? 'approve' : 'reject'} route in status ${current}`);
  }
}

// ---------- Operators ----------

export async function listOperatorsForAdmin(p: {
  actor: Actor; status?: string | undefined; limit: number;
}): Promise<OperatorAdminDTO[]> {
  const rows = await repo.listOperators({ status: p.status, limit: p.limit });
  return rows.map((r) => toOperatorAdminDTO(r.operator, r.counts));
}

export async function getOperatorForAdmin(p: {
  actor: Actor; operatorId: string;
}): Promise<OperatorAdminDTO> {
  const row = await repo.findOperatorById(p.operatorId);
  if (!row) throw errors.notFound('Operator not found');
  return toOperatorAdminDTO(row.operator, row.counts);
}

export async function approveOperator(p: {
  actor: Actor; operatorId: string; reason: string;
}): Promise<OperatorAdminDTO> {
  const existing = await repo.findOperatorById(p.operatorId);
  if (!existing) throw errors.notFound('Operator not found');
  assertOperatorTransition(existing.operator.status, 'APPROVED');

  await prisma.$transaction(async (tx) => {
    await tx.operator.update({ where: { id: p.operatorId }, data: { status: 'APPROVED' } });
    await writeAuditEvent({
      actorId: p.actor.userId,
      sessionId: p.actor.sessionId,
      entityType: 'Operator',
      entityId: p.operatorId,
      action: 'operator_approved',
      reason: p.reason,
      ipAddress: p.actor.ip ?? null,
      metadata: { previousStatus: existing.operator.status, newStatus: 'APPROVED' },
      tx,
    });
  });

  const updated = await repo.findOperatorById(p.operatorId);
  return toOperatorAdminDTO(updated!.operator, updated!.counts);
}

export async function rejectOperator(p: {
  actor: Actor; operatorId: string; reason: string;
}): Promise<OperatorAdminDTO> {
  const existing = await repo.findOperatorById(p.operatorId);
  if (!existing) throw errors.notFound('Operator not found');
  assertOperatorTransition(existing.operator.status, 'REJECTED');

  await prisma.$transaction(async (tx) => {
    await tx.operator.update({ where: { id: p.operatorId }, data: { status: 'REJECTED' } });
    await writeAuditEvent({
      actorId: p.actor.userId,
      sessionId: p.actor.sessionId,
      entityType: 'Operator',
      entityId: p.operatorId,
      action: 'operator_rejected',
      reason: p.reason,
      ipAddress: p.actor.ip ?? null,
      metadata: { previousStatus: existing.operator.status, newStatus: 'REJECTED' },
      tx,
    });
  });

  const updated = await repo.findOperatorById(p.operatorId);
  return toOperatorAdminDTO(updated!.operator, updated!.counts);
}

export async function suspendOperator(p: {
  actor: Actor; operatorId: string; reason: string;
}): Promise<{ operator: OperatorAdminDTO; sessionsRevoked: number }> {
  const existing = await repo.findOperatorById(p.operatorId);
  if (!existing) throw errors.notFound('Operator not found');
  assertOperatorTransition(existing.operator.status, 'SUSPENDED');

  const result = await prisma.$transaction(async (tx) => {
    await tx.operator.update({ where: { id: p.operatorId }, data: { status: 'SUSPENDED' } });

    const opUserRows = await tx.operatorUser.findMany({
      where: { operatorId: p.operatorId, deletedAt: null },
      select: { userId: true },
    });
    const driverRows = await tx.driverProfile.findMany({
      where: { operatorId: p.operatorId, deletedAt: null },
      select: { userId: true },
    });
    const userIds = [...new Set([...opUserRows.map((r) => r.userId), ...driverRows.map((r) => r.userId)])];

    let sessionsRevoked = 0;
    if (userIds.length > 0) {
      const r = await tx.session.updateMany({
        where: {
          userId: { in: userIds },
          status: 'ACTIVE',
          role: { in: ['OPERATOR_OWNER', 'OPERATOR_MANAGER', 'DRIVER'] },
        },
        data: { status: 'REVOKED', revokedAt: new Date(), revokeReason: 'OPERATOR_SUSPENDED' },
      });
      sessionsRevoked = r.count;
    }

    await writeAuditEvent({
      actorId: p.actor.userId,
      sessionId: p.actor.sessionId,
      entityType: 'Operator',
      entityId: p.operatorId,
      action: 'operator_suspended',
      reason: p.reason,
      ipAddress: p.actor.ip ?? null,
      metadata: {
        previousStatus: existing.operator.status,
        sessionsRevoked,
        affectedUserCount: userIds.length,
      },
      tx,
    });

    return { sessionsRevoked };
  });

  const updated = await repo.findOperatorById(p.operatorId);
  return {
    operator: toOperatorAdminDTO(updated!.operator, updated!.counts),
    sessionsRevoked: result.sessionsRevoked,
  };
}

// ---------- Buses ----------

export async function listBusesForAdmin(p: {
  actor: Actor; status?: string | undefined; operatorId?: string | undefined; limit: number;
}): Promise<BusAdminDTO[]> {
  const rows = await repo.listBuses({ status: p.status, operatorId: p.operatorId, limit: p.limit });
  return rows.map(toBusAdminDTO);
}

export async function approveBus(p: {
  actor: Actor; busId: string; reason: string;
}): Promise<BusAdminDTO> {
  const existing = await repo.findBusById(p.busId);
  if (!existing) throw errors.notFound('Bus not found');
  assertBusTransition(existing.approvalStatus, 'APPROVED');

  await prisma.$transaction(async (tx) => {
    await tx.bus.update({ where: { id: p.busId }, data: { approvalStatus: 'APPROVED' } });
    await writeAuditEvent({
      actorId: p.actor.userId,
      sessionId: p.actor.sessionId,
      entityType: 'Bus',
      entityId: p.busId,
      action: 'bus_approved',
      reason: p.reason,
      ipAddress: p.actor.ip ?? null,
      metadata: { previousStatus: existing.approvalStatus, newStatus: 'APPROVED' },
      tx,
    });
  });

  const updated = await repo.findBusById(p.busId);
  return toBusAdminDTO(updated!);
}

export async function rejectBus(p: {
  actor: Actor; busId: string; reason: string;
}): Promise<BusAdminDTO> {
  const existing = await repo.findBusById(p.busId);
  if (!existing) throw errors.notFound('Bus not found');
  assertBusTransition(existing.approvalStatus, 'REJECTED');

  await prisma.$transaction(async (tx) => {
    await tx.bus.update({ where: { id: p.busId }, data: { approvalStatus: 'REJECTED' } });
    await writeAuditEvent({
      actorId: p.actor.userId,
      sessionId: p.actor.sessionId,
      entityType: 'Bus',
      entityId: p.busId,
      action: 'bus_rejected',
      reason: p.reason,
      ipAddress: p.actor.ip ?? null,
      metadata: { previousStatus: existing.approvalStatus, newStatus: 'REJECTED' },
      tx,
    });
  });

  const updated = await repo.findBusById(p.busId);
  return toBusAdminDTO(updated!);
}

// ---------- Routes ----------

export async function listRoutesForAdmin(p: {
  actor: Actor; status?: string | undefined; operatorId?: string | undefined; limit: number;
}): Promise<RouteAdminDTO[]> {
  const rows = await repo.listRoutes({ status: p.status, operatorId: p.operatorId, limit: p.limit });
  return rows.map(toRouteAdminDTO);
}

export async function approveRoute(p: {
  actor: Actor; routeId: string; reason: string;
}): Promise<RouteAdminDTO> {
  const existing = await repo.findRouteById(p.routeId);
  if (!existing) throw errors.notFound('Route not found');
  assertRouteTransition(existing.approvalStatus, 'APPROVED');

  await prisma.$transaction(async (tx) => {
    await tx.route.update({ where: { id: p.routeId }, data: { approvalStatus: 'APPROVED' } });
    await writeAuditEvent({
      actorId: p.actor.userId,
      sessionId: p.actor.sessionId,
      entityType: 'Route',
      entityId: p.routeId,
      action: 'route_approved',
      reason: p.reason,
      ipAddress: p.actor.ip ?? null,
      metadata: { previousStatus: existing.approvalStatus, newStatus: 'APPROVED' },
      tx,
    });
  });

  const updated = await repo.findRouteById(p.routeId);
  return toRouteAdminDTO(updated!);
}

// ---------- Schedules ----------

export async function listSchedulesForAdmin(p: {
  actor: Actor; status?: string | undefined; operatorId?: string | undefined; limit: number;
}): Promise<ScheduleAdminDTO[]> {
  const rows = await repo.listSchedules({ status: p.status, operatorId: p.operatorId, limit: p.limit });
  return rows.map(toScheduleAdminDTO);
}

export async function approveSchedule(p: {
  actor: Actor; scheduleId: string; reason: string;
}): Promise<ScheduleAdminDTO> {
  const existing = await repo.findScheduleById(p.scheduleId);
  if (!existing) throw errors.notFound('Schedule not found');

  // Already published — idempotent no-op, no audit (nothing changed)
  if (existing.status === 'PUBLISHED') {
    return toScheduleAdminDTO(existing);
  }

  if (existing.status !== 'DRAFT') {
    throw errors.invalidTransition(`Cannot approve schedule in status ${existing.status}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.schedule.update({ where: { id: p.scheduleId }, data: { status: 'PUBLISHED' } });
    await writeAuditEvent({
      actorId: p.actor.userId,
      sessionId: p.actor.sessionId,
      entityType: 'Schedule',
      entityId: p.scheduleId,
      action: 'schedule_approved',
      reason: p.reason,
      ipAddress: p.actor.ip ?? null,
      metadata: { previousStatus: existing.status, newStatus: 'PUBLISHED', adminOverride: true },
      tx,
    });
  });

  const updated = await repo.findScheduleById(p.scheduleId);
  return toScheduleAdminDTO(updated!);
}

// ---------- Bookings oversight ----------

export async function listBookingsForAdmin(p: {
  actor: Actor;
  status?: string | undefined;
  userId?: string | undefined;
  scheduleId?: string | undefined;
  operatorId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  limit: number;
}): Promise<AdminBookingDTO[]> {
  const fromDate = p.from ? istDayBounds(p.from).from : undefined;
  const toDate = p.to ? istDayBounds(p.to).to : undefined;

  const rows = await repo.listBookings({
    status: p.status,
    userId: p.userId,
    scheduleId: p.scheduleId,
    operatorId: p.operatorId,
    from: fromDate,
    to: toDate,
    limit: p.limit,
  });

  const allSeatIds = rows.flatMap((b) => b.passengers.map((pp) => pp.seatId));
  const seatLabelMap = await repo.fetchSeatLabels(allSeatIds);

  // List is always masked — includePii is only for GET /admin/bookings/:id
  return rows.map((b) => toAdminBookingDTO(b, seatLabelMap, false));
}

export async function getBookingForAdmin(p: {
  actor: Actor;
  bookingId: string;
  includePii: boolean;
  reason?: string | undefined;
}): Promise<AdminBookingDTO> {
  if (p.includePii && !p.reason) {
    throw errors.reasonRequired('reason is required when includePii=true');
  }

  const booking = await repo.findBookingById(p.bookingId);
  if (!booking) throw errors.notFound('Booking not found');

  const allSeatIds = booking.passengers.map((pp) => pp.seatId);
  const seatLabelMap = await repo.fetchSeatLabels(allSeatIds);

  const dto = toAdminBookingDTO(booking, seatLabelMap, p.includePii);

  if (p.includePii) {
    // Enrich passenger PII (idNumber is DB-resident, no unmask needed for the value itself)
    dto.passengers = dto.passengers.map((psg, i) => {
      const raw = booking.passengers[i]!;
      const enriched = { ...psg };
      if (raw.idNumber !== null) enriched.idNumber = raw.idNumber;
      return enriched;
    });

    // User phone/email
    const userPhone = booking.user?.phone ?? '';
    const userEmail = booking.user?.email ?? null;

    // Stand summary
    const boardingStand = {
      id: booking.boardingStand.id,
      cityId: booking.boardingStand.cityId,
      name: booking.boardingStand.name,
      type: booking.boardingStand.type as 'BUS_STAND' | 'PICKUP_POINT' | 'DROP_POINT',
      lat: Number(booking.boardingStand.lat),
      lng: Number(booking.boardingStand.lng),
    };
    const droppingStand = {
      id: booking.droppingStand.id,
      cityId: booking.droppingStand.cityId,
      name: booking.droppingStand.name,
      type: booking.droppingStand.type as 'BUS_STAND' | 'PICKUP_POINT' | 'DROP_POINT',
      lat: Number(booking.droppingStand.lat),
      lng: Number(booking.droppingStand.lng),
    };

    // Audit write — required per contract 04 §11.4
    const auditLogId = await writeAuditEvent({
      actorId: p.actor.userId,
      sessionId: p.actor.sessionId,
      entityType: 'Booking',
      entityId: p.bookingId,
      action: 'pii_accessed',
      reason: p.reason ?? null,
      ipAddress: p.actor.ip ?? null,
      metadata: { unmasked: ['passengers.idNumber', 'user.phone', 'user.email'] },
    });

    dto.pii = {
      userPhone,
      userEmail,
      boardingStand,
      droppingStand,
      auditLogId,
    };
  }

  return dto;
}

// ---------- Dashboard ----------

export async function getAdminDashboard(p: { actor: Actor }): Promise<AdminDashboardDTO> {
  const today = todayIstDate();
  const { from, to } = istDayBounds(today);
  const sevenDaysAgo = new Date(from.getTime() - 6 * 24 * 3600 * 1000);

  const [counts, bookingToday, revenueTodayPaise, revenue7dPaise, revenueTotalPaise] = await Promise.all([
    repo.getDashboardCounts(),
    repo.countBookingsToday(from, to),
    repo.sumRevenueToday(from, to),
    repo.sumRevenueLast7Days(sevenDaysAgo, to),
    repo.sumRevenueTotal(),
  ]);

  return toAdminDashboardDTO({
    operatorCounts: counts.operatorCounts,
    busTotal: counts.busTotal,
    busPending: counts.busPending,
    busApproved: counts.busApproved,
    routeTotal: counts.routeTotal,
    routePending: counts.routePending,
    scheduleTotal: counts.scheduleTotal,
    schedulePublished: counts.schedulePublished,
    scheduleDraft: counts.scheduleDraft,
    bookingTotal: counts.bookingTotal,
    bookingToday,
    bookingConfirmed: counts.bookingConfirmed,
    bookingCancelled: counts.bookingCancelled,
    revenueTodayPaise,
    revenue7dPaise,
    revenueTotalPaise,
    driverTotal: counts.driverTotal,
    driverOnDuty: counts.driverOnDuty,
  });
}
// ---------- Payments + refunds oversight (Phase 5) ----------

type PaymentRow = NonNullable<Awaited<ReturnType<typeof repo.findPaymentById>>>;
type RefundRow = {
  id: string;
  paymentId: string;
  amountPaise: bigint;
  status: string;
  refundTier: string;
  reason: string;
  gatewayRefundId: string | null;
  initiatedAt: Date;
  processedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  payment?: { booking?: { id: string; bookingReference: string } | null } | null;
};

function toPaymentDTO(row: PaymentRow): AdminPaymentDTO {
  const op = row.booking.schedule.operator;
  return {
    paymentId: row.id,
    userId: row.booking.userId,
    bookingId: row.bookingId,
    bookingReference: row.booking.bookingReference,
    status: row.status,
    method: row.method,
    amountPaise: Number(row.amountPaise),
    currency: row.currency,
    gatewayOrderId: row.gatewayOrderId,
    gatewayPaymentId: row.gatewayPaymentId,
    initiatedAt: row.initiatedAt.toISOString(),
    succeededAt: row.succeededAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    expiresAt: row.expiredAt?.toISOString() ?? null,
    operator: { id: op.id, companyName: op.companyName },
    createdAt: row.createdAt.toISOString(),
  };
}

function toRefundDTO(row: RefundRow): AdminRefundDTO {
  return {
    refundId: row.id,
    paymentId: row.paymentId,
    bookingId: row.payment?.booking?.id ?? null,
    bookingReference: row.payment?.booking?.bookingReference ?? null,
    amountPaise: Number(row.amountPaise),
    status: row.status as AdminRefundDTO['status'],
    refundTier: row.refundTier as AdminRefundDTO['refundTier'],
    reason: row.reason as AdminRefundDTO['reason'],
    gatewayRefundId: row.gatewayRefundId,
    initiatedAt: row.initiatedAt.toISOString(),
    processedAt: row.processedAt?.toISOString() ?? null,
    failureReason: row.failureReason,
    createdAt: row.createdAt.toISOString(),
  };
}
export async function listPaymentsForAdmin(p: {
  actor: Actor;
  status?: string | undefined;
  bookingId?: string | undefined;
  operatorId?: string | undefined;
  limit: number;
}): Promise<AdminPaymentDTO[]> {
  const rows = await repo.listPayments({
    status: p.status,
    bookingId: p.bookingId,
    operatorId: p.operatorId,
    limit: p.limit,
  });
  return rows.map(toPaymentDTO);
}

export async function getPaymentForAdmin(p: {
  actor: Actor;
  paymentId: string;
}): Promise<AdminPaymentDetailDTO> {
  const row = await repo.findPaymentById(p.paymentId);
  if (!row) throw errors.notFound('Payment not found');
  const base = toPaymentDTO(row);
  const webhookCount = await repo.countWebhooksForPayment(row.id);
  return {
    ...base,
    refunds: row.refunds.map(toRefundDTO),
    webhookCount,
  };
}

export async function listRefundsForAdmin(p: {
  actor: Actor;
  status?: string | undefined;
  paymentId?: string | undefined;
  limit: number;
}): Promise<AdminRefundDTO[]> {
  const rows = await repo.listRefunds({
    status: p.status,
    paymentId: p.paymentId,
    limit: p.limit,
  });
  return rows.map(toRefundDTO);
}
export async function refundPaymentAsAdmin(p: {
  actor: Actor;
  paymentId: string;
  amountPaise: number;
  reason: string;
  refundReason: 'DISPUTE' | 'DUPLICATE_CHARGE' | 'TRIP_CANCELLED';
}): Promise<AdminRefundDTO> {
  const payment = await repo.findPaymentById(p.paymentId);
  if (!payment) throw errors.notFound('Payment not found');
  if (payment.status !== 'SUCCEEDED') throw errors.paymentNotRefundable();
  if (BigInt(p.amountPaise) > payment.amountPaise) throw errors.refundExceedsPayment();

  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      reason: p.refundReason,
      refundTier: 'TIER_FULL',
      amountPaise: BigInt(p.amountPaise),
      status: 'INITIATED',
    },
  });

  let gatewayRefundId: string | null = null;
  let finalStatus: AdminRefundDTO['status'] = 'INITIATED';
  let failureReason: string | null = null;

  if (payment.gatewayPaymentId) {
    try {
      const gr = await razorpayAdapter.createRefund({
        paymentId: payment.gatewayPaymentId,
        amountPaise: BigInt(p.amountPaise),
        notes: { bookingId: payment.bookingId, adminRefund: 'true' },
      });
      gatewayRefundId = gr.refundId;
      await prisma.refund.update({
        where: { id: refund.id },
        data: { gatewayRefundId },
      });
    } catch (err) {
      finalStatus = 'FAILED';
      failureReason = (err as Error).message.slice(0, 200);
      logger.error({ err, refundId: refund.id, paymentId: payment.id }, 'admin refund gateway failed');
      await prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'FAILED', failureReason },
      });
    }
  }

  const auditLogId = await writeAuditEvent({
    actorId: p.actor.userId,
    sessionId: p.actor.sessionId,
    entityType: 'Payment',
    entityId: payment.id,
    action: 'admin_refund_initiated',
    reason: p.reason,
    ipAddress: p.actor.ip ?? null,
    metadata: { refundId: refund.id, amountPaise: p.amountPaise, gatewayRefundId, status: finalStatus },
  });

  emitToTopic('admin:notifications', events.refundRequested({
    refundId: refund.id,
    bookingId: payment.bookingId,
    amountPaise: p.amountPaise,
    reason: p.refundReason,
  }));

  return {
    refundId: refund.id,
    paymentId: payment.id,
    bookingId: payment.bookingId,
    bookingReference: payment.booking.bookingReference,
    amountPaise: p.amountPaise,
    status: finalStatus,
    refundTier: 'TIER_FULL',
    reason: p.refundReason,
    gatewayRefundId,
    initiatedAt: refund.initiatedAt.toISOString(),
    processedAt: null,
    failureReason,
    createdAt: refund.createdAt.toISOString(),
    ...({ auditLogId } as Record<string, unknown>),
  } as AdminRefundDTO;
}