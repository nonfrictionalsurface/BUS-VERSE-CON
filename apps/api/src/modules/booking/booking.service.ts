import * as events from '../../realtime/events.js';
import { emitToBooking, emitToTopic } from '../../realtime/emit.js';
import { prisma } from '../../lib/prisma.js';
import { redis, keys } from '../../lib/redis.js';
import { writeAuditEvent } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import { razorpayAdapter } from '../../integrations/razorpay.js';
import { compactLayout, legacyAisleCells } from '@busverse/seat-engine';
import { layoutOfRows } from '../network/seat-layout.shared.js';
import { bookingErrors } from './booking.errors.js';
import * as repo from './booking.repository.js';
import {
  BOOKING_LOCK_TTL_SECONDS, CONVENIENCE_FEE_PAISE,
  type BookingStatus, type BookingSummaryDTO, type BookingDetailDTO,
  type RefundPreviewDTO, type RefundTier, type CreateBookingResultDTO,
} from './booking.types.js';

const FIFTEEN_MIN_MS = BOOKING_LOCK_TTL_SECONDS * 1000;

function calcFare(scheduleFarePaise: bigint, count: number): {
  baseFare: bigint; taxPaise: bigint; feePaise: bigint; total: bigint;
} {
  const baseFare = scheduleFarePaise * BigInt(count);
  const taxPaise = (baseFare * 5n + 50n) / 100n;   // 5% round-half-up
  const feePaise = CONVENIENCE_FEE_PAISE;
  const total = baseFare + taxPaise + feePaise;
  return { baseFare, taxPaise, feePaise, total };
}

async function nextBookingReference(tx: { $queryRawUnsafe: <T>(q: string) => Promise<T> }): Promise<string> {
  const year = new Date().getFullYear();
  const seq = year === 2027 ? 'booking_reference_seq_2027' : 'booking_reference_seq_2026';
  const rows = await tx.$queryRawUnsafe<Array<{ nextval: bigint }>>(`SELECT nextval('${seq}'::regclass)`);
  const n = Number(rows[0]!.nextval);
  return `BKG-${year}-${String(n).padStart(5, '0')}`;
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { code?: string }).code === 'P2002';
}
export async function createBooking(
  userId: string,
  payload: {
    lockId: string;
    boardingStandId: string;
    droppingStandId: string;
    passengers: Array<{ seatId: string; name: string; age?: number | undefined; gender?: string | undefined }>;
  },
): Promise<CreateBookingResultDTO> {
  // 1. Representative lock — must exist, belong to this user, still active
  const lock = await prisma.seatLock.findFirst({
    where: { id: payload.lockId, userId, expiresAt: { gt: new Date() }, deletedAt: null },
    select: { scheduleId: true },
  });
  if (!lock) throw bookingErrors.lockNotFound();

  // 2. Schedule guard — PUBLISHED, departure in future
  const schedule = await prisma.schedule.findFirst({
    where: { id: lock.scheduleId, deletedAt: null },
    select: { id: true, status: true, departureTime: true, fareAmountPaise: true, fareCurrency: true },
  });
  if (!schedule || schedule.status !== 'PUBLISHED') throw bookingErrors.invalidSchedule();
  if (schedule.departureTime.getTime() <= Date.now()) throw bookingErrors.scheduleDeparted();

  // 3. Stands exist
  const [boarding, dropping] = await Promise.all([
    prisma.stand.findFirst({ where: { id: payload.boardingStandId, deletedAt: null } }),
    prisma.stand.findFirst({ where: { id: payload.droppingStandId, deletedAt: null } }),
  ]);
  if (!boarding || !dropping) throw bookingErrors.invalidStand();

  // 4. Fare calculation
  const { baseFare, taxPaise, feePaise, total } = calcFare(schedule.fareAmountPaise, payload.passengers.length);
  const seatIds = payload.passengers.map((p) => p.seatId);
  const extendedExpiresAt = new Date(Date.now() + FIFTEEN_MIN_MS);

  // 5. Transaction: insert booking + passengers, extend locks (G1 Postgres side)
  try {
    const result = await prisma.$transaction(async (tx) => {
      const bookingReference = await nextBookingReference(tx);
      const booking = await tx.booking.create({
        data: {
          bookingReference,
          userId,
          scheduleId: schedule.id,
          boardingStandId: payload.boardingStandId,
          droppingStandId: payload.droppingStandId,
          totalFareAmount: total,
          totalFareCurrency: schedule.fareCurrency,
          fareBreakdownJson: {
            _v: 1,
            base_fare_paise: Number(baseFare),
            tax_paise: Number(taxPaise),
            convenience_fee_paise: Number(feePaise),
            total_paise: Number(total),
          },
          status: 'PENDING',
        },
        select: { id: true, bookingReference: true },
      });
      const liveSeats = await tx.seat.findMany({ where: { id: { in: seatIds }, deletedAt: null }, select: { id: true, seatLabel: true } });
      if (liveSeats.length !== seatIds.length) throw bookingErrors.invalidSeat();
      const labelOf = new Map(liveSeats.map((s) => [s.id, s.seatLabel] as const));
      await tx.bookingPassenger.createMany({
        data: payload.passengers.map((p) => ({
          bookingId: booking.id,
          seatId: p.seatId,
          seatLabel: labelOf.get(p.seatId) ?? null,
          scheduleId: schedule.id,
          name: p.name,
          age: p.age ?? null,
          gender: p.gender ?? null,
        })),
      });
      const extended = await tx.seatLock.updateMany({
        where: { scheduleId: schedule.id, seatId: { in: seatIds }, userId, expiresAt: { gt: new Date() }, deletedAt: null },
        data: { expiresAt: extendedExpiresAt },
      });
      if (extended.count !== seatIds.length) throw bookingErrors.lockExpired();
      return { bookingId: booking.id, bookingReference: booking.bookingReference };
    });

    // 6. G1 Redis side — best-effort, Postgres already correct
    for (const seatId of seatIds) {
      await redis.expire(keys.seatLock(schedule.id, seatId), BOOKING_LOCK_TTL_SECONDS).catch(() => {});
    }

    return {
      bookingId: result.bookingId,
      bookingReference: result.bookingReference,
      status: 'PENDING' as BookingStatus,
      expiresAt: extendedExpiresAt.toISOString(),
      totalFarePaise: Number(total),
    };
  } catch (err) {
    if (isPrismaUniqueViolation(err)) throw bookingErrors.seatAlreadyBooked(seatIds[0]!);
    throw err;
  }
}
export async function listMyBookings(
  userId: string,
  params: { limit: number; cursor?: string | undefined; status?: string | undefined },
): Promise<{ data: BookingSummaryDTO[]; nextCursor: string | null }> {
  let cursorCreatedAt: Date | undefined;
  if (params.cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(params.cursor, 'base64').toString('utf8')) as { createdAt: string };
      cursorCreatedAt = new Date(decoded.createdAt);
    } catch { throw bookingErrors.notFound(); }
  }

  const rows = await prisma.booking.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
      ...(cursorCreatedAt ? { createdAt: { lt: cursorCreatedAt } } : {}),
    },
    take: params.limit + 1,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      passengers: { where: { deletedAt: null }, include: { seat: { select: { seatLabel: true } } } },
      schedule: { include: { route: { include: { originCity: true, destCity: true } } } },
    },
  });

  const hasMore = rows.length > params.limit;
  const data = hasMore ? rows.slice(0, params.limit) : rows;
  const nextCursor = hasMore
    ? Buffer.from(JSON.stringify({ createdAt: data[data.length - 1]!.createdAt.toISOString() })).toString('base64')
    : null;

  return {
    data: data.map((b) => ({
      bookingId: b.id,
      bookingReference: b.bookingReference,
      status: b.status as BookingStatus,
      scheduleId: b.scheduleId,
      departureTime: b.schedule.departureTime.toISOString(),
      routeSummary: { originCity: b.schedule.route.originCity.name, destinationCity: b.schedule.route.destCity.name },
      passengerCount: b.passengers.length,
      passengers: b.passengers.map((p) => ({
        seatId: p.seatId, seatLabel: p.seatLabel ?? p.seat.seatLabel, name: p.name, age: p.age, gender: p.gender,
      })),
      totalFarePaise: Number(b.totalFareAmount),
      confirmedAt: b.confirmedAt?.toISOString() ?? null,
      createdAt: b.createdAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function getMyBooking(userId: string, bookingId: string): Promise<BookingDetailDTO> {
  const b = await prisma.booking.findFirst({
    where: { id: bookingId, userId, deletedAt: null },
    include: {
      passengers: { where: { deletedAt: null }, include: { seat: { select: { seatLabel: true } } } },
      schedule: { include: { route: { include: { originCity: true, destCity: true } } } },
      boardingStand: true,
      droppingStand: true,
      payments: { where: { deletedAt: null }, take: 1, orderBy: { createdAt: 'desc' } },
      ticket: true,
    },
  });
  if (!b) throw bookingErrors.notFound();

  const trip = await prisma.trip.findFirst({
    where: { scheduleId: b.scheduleId, deletedAt: null, status: { not: 'CANCELLED' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true },
  });
  const fb = b.fareBreakdownJson as {
    base_fare_paise?: number; tax_paise?: number; convenience_fee_paise?: number; total_paise?: number;
  };
  const expiresAt = b.status === 'PENDING'
    ? new Date(b.createdAt.getTime() + FIFTEEN_MIN_MS).toISOString()
    : null;

  return {
    bookingId: b.id,
    bookingReference: b.bookingReference,
    status: b.status as BookingStatus,
    scheduleId: b.scheduleId,
    departureTime: b.schedule.departureTime.toISOString(),
    arrivalTime: b.schedule.arrivalTime.toISOString(),
    routeSummary: { originCity: b.schedule.route.originCity.name, destinationCity: b.schedule.route.destCity.name },
    passengerCount: b.passengers.length,
    passengers: b.passengers.map((p) => ({
      seatId: p.seatId, seatLabel: p.seatLabel ?? p.seat.seatLabel, name: p.name, age: p.age, gender: p.gender,
    })),
    totalFarePaise: Number(b.totalFareAmount),
    confirmedAt: b.confirmedAt?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
    boardingStand: { id: b.boardingStand.id, name: b.boardingStand.name, type: b.boardingStand.type },
    droppingStand: { id: b.droppingStand.id, name: b.droppingStand.name, type: b.droppingStand.type },
    fareBreakdown: {
      baseFarePaise: fb.base_fare_paise ?? 0,
      taxPaise: fb.tax_paise ?? 0,
      convenienceFeePaise: fb.convenience_fee_paise ?? 0,
      totalPaise: fb.total_paise ?? Number(b.totalFareAmount),
    },
    payment: b.payments[0]
      ? { paymentId: b.payments[0].id, status: b.payments[0].status as any, amountPaise: Number(b.payments[0].amountPaise), currency: b.payments[0].currency }
      : null,
    ticket: b.ticket ? { ticketId: b.ticket.id, status: b.ticket.status as any, issuedAt: b.ticket.issuedAt.toISOString() } : null,
    expiresAt,
    trip: trip ? { tripId: trip.id, status: trip.status } : null,
  };
}
// Canonical refund tier calculator per shared/02 §10 + 07 §4.5
function calcRefundTier(params: {
  departureAt: Date;
  farePaise: bigint;
  taxPaise: bigint;
  feePaise: bigint;
  operatorCancelled: boolean;
}): { tier: RefundTier; fare: bigint; tax: bigint; fee: bigint; total: bigint; deadline: Date | null } {
  const now = Date.now();
  const t = params.departureAt.getTime() - now;

  if (params.operatorCancelled) {
    return { tier: 'TIER_FULL', fare: params.farePaise, tax: params.taxPaise, fee: params.feePaise,
      total: params.farePaise + params.taxPaise + params.feePaise, deadline: null };
  }
  if (t <= 0) {
    return { tier: 'TIER_NOT_ELIGIBLE', fare: 0n, tax: 0n, fee: 0n, total: 0n, deadline: null };
  }

  const H = 3_600_000;
  let farePct: bigint, feeKept: boolean, tier: RefundTier, deadlineMs: number | null;
  if (t >= 24 * H)      { farePct = 100n; feeKept = true; tier = 'TIER_FULL'; deadlineMs = params.departureAt.getTime() - 24 * H; }
  else if (t >= 12 * H) { farePct = 75n;  feeKept = true; tier = 'TIER_75';   deadlineMs = params.departureAt.getTime() - 12 * H; }
  else if (t >= 2 * H)  { farePct = 50n;  feeKept = true; tier = 'TIER_50';   deadlineMs = params.departureAt.getTime() - 2 * H; }
  else                  { farePct = 0n;   feeKept = true; tier = 'TIER_ZERO'; deadlineMs = params.departureAt.getTime(); }

  const fareRefund = (params.farePaise * farePct) / 100n;
  const taxRefund = (params.taxPaise * farePct) / 100n;
  const feeRefund = feeKept ? params.feePaise : 0n;
  return { tier, fare: fareRefund, tax: taxRefund, fee: feeRefund,
    total: fareRefund + taxRefund + feeRefund, deadline: deadlineMs !== null ? new Date(deadlineMs) : null };
}

export async function previewRefund(userId: string, bookingId: string): Promise<RefundPreviewDTO> {
  const b = await prisma.booking.findFirst({
    where: { id: bookingId, userId, deletedAt: null },
    include: { schedule: true, payments: { where: { deletedAt: null }, take: 1, orderBy: { createdAt: 'desc' } } },
  });
  if (!b) throw bookingErrors.notFound();

  const fb = b.fareBreakdownJson as { base_fare_paise?: number; tax_paise?: number; convenience_fee_paise?: number };
  const fare = BigInt(fb.base_fare_paise ?? 0);
  const tax = BigInt(fb.tax_paise ?? 0);
  const fee = BigInt(fb.convenience_fee_paise ?? 0);
  const totalPaid = fare + tax + fee;

  const result = calcRefundTier({
    departureAt: b.schedule.departureTime, farePaise: fare, taxPaise: tax, feePaise: fee,
    operatorCancelled: b.status === 'OPERATOR_CANCELLED',
  });

  const payment = b.payments[0];
  return {
    bookingId: b.id,
    tier: result.tier,
    totalPaidPaise: Number(totalPaid),
    fareRefundPaise: Number(result.fare),
    taxRefundPaise: Number(result.tax),
    feeRefundPaise: Number(result.fee),
    totalRefundPaise: Number(result.total),
    cancellationDeadlineAt: result.deadline?.toISOString() ?? null,
    paymentMethod: payment?.method ?? null,
    paymentMethodLast4: null,
    expectedRefundDays: { min: 3, max: 5 },
  };
}
export async function cancelBooking(
  userId: string,
  bookingId: string,
): Promise<{ bookingId: string; status: 'CANCELLED'; refund: { refundId: string; tier: RefundTier; amountPaise: number; status: string } }> {
  const b = await prisma.booking.findFirst({
    where: { id: bookingId, userId, deletedAt: null },
    include: { schedule: true, payments: { where: { deletedAt: null, status: 'SUCCEEDED' }, take: 1, orderBy: { createdAt: 'desc' } } },
  });
  if (!b) throw bookingErrors.notFound();
  if (b.status !== 'CONFIRMED' && b.status !== 'OPERATOR_CANCELLED') throw bookingErrors.bookingNotConfirmed();

  const payment = b.payments[0];
  if (!payment) throw bookingErrors.paymentNotFound();

  const fb = b.fareBreakdownJson as { base_fare_paise?: number; tax_paise?: number; convenience_fee_paise?: number };
  const result = calcRefundTier({
    departureAt: b.schedule.departureTime,
    farePaise: BigInt(fb.base_fare_paise ?? 0),
    taxPaise: BigInt(fb.tax_paise ?? 0),
    feePaise: BigInt(fb.convenience_fee_paise ?? 0),
    operatorCancelled: b.status === 'OPERATOR_CANCELLED',
  });

  const reason = b.status === 'OPERATOR_CANCELLED' ? 'OPERATOR_CANCELLED' : 'PASSENGER_CANCELLED';

  const refundId = await prisma.$transaction(async (tx) => {
    const refund = await tx.refund.create({
      data: {
        paymentId: payment.id,
        reason,
        refundTier: result.tier,
        amountPaise: result.total,
        status: 'INITIATED',
      },
      select: { id: true },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    await tx.ticket.updateMany({
      where: { bookingId },
      data: { status: 'CANCELLED' },
    });
    await writeAuditEvent({
      tx, actorId: userId, sessionId: null,
      entityType: 'Booking', entityId: bookingId,
      action: 'booking_cancelled',
      metadata: { tier: result.tier, refundPaise: Number(result.total) },
    });
    return refund.id;
  });

  emitToBooking(bookingId, events.refundRequested({
    refundId,
    bookingId,
    amountPaise: Number(result.total),
    reason,
  }));
  emitToBooking(bookingId, events.bookingCancelled({
    bookingId,
    reason,
    refundId,
  }));

  // Phase 5: fire gateway refund async; webhook confirms state transition
  if (result.total > 0n && payment.gatewayPaymentId) {
    try {
      const gatewayRefund = await razorpayAdapter.createRefund({
        paymentId: payment.gatewayPaymentId,
        amountPaise: result.total,
        notes: { bookingId, refundTier: result.tier },
      });
      await prisma.refund.update({
        where: { id: refundId },
        data: { gatewayRefundId: gatewayRefund.refundId },
      });
    } catch (err) {
      logger.error(
        { err, refundId, bookingId, tier: result.tier },
        'razorpay refund failed (refund row stays INITIATED)',
      );
    }
  }

  return {
    bookingId,
    status: 'CANCELLED',
    refund: { refundId, tier: result.tier, amountPaise: Number(result.total), status: 'INITIATED' },
  };
}
/**
 * Handles a single PENDING booking timeout. Phase 8 cron calls this in a loop;
 * Phase 4 tests call it directly for TV-11.
 * Returns true if the booking transitioned PENDING → EXPIRED, false if not PENDING (idempotent).
 * Per shared/03 §6.2: also soft-deletes booking_passengers (G4 fix) so the seat is re-lockable.
 */
export async function expirePendingBooking(bookingId: string): Promise<boolean> {
  const b = await prisma.booking.findFirst({
    where: { id: bookingId, status: 'PENDING', deletedAt: null },
    include: { passengers: { where: { deletedAt: null }, select: { seatId: true } } },
  });
  if (!b) return false;

  const seatIds = b.passengers.map((p) => p.seatId);

  const didExpire = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.updateMany({
      where: { id: bookingId, status: 'PENDING' },
      data: { status: 'EXPIRED', expiredAt: new Date() },
    });
    if (updated.count === 0) return false;

    await tx.payment.updateMany({
      where: { bookingId, status: { in: ['INITIATED', 'PENDING'] } },
      data: { status: 'EXPIRED', expiredAt: new Date() },
    });
    await tx.seatLock.deleteMany({
      where: { scheduleId: b.scheduleId, seatId: { in: seatIds } },
    });
    // G4 — soft-delete passengers so pre-check releases the seat
    await tx.bookingPassenger.updateMany({
      where: { bookingId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await writeAuditEvent({
      tx, actorId: null, sessionId: null,
      entityType: 'Booking', entityId: bookingId,
      action: 'booking_expired',
    });
    return true;
  });

  if (didExpire) {
    // G6 — Redis DEL after commit, best-effort
    for (const seatId of seatIds) {
      await redis.del(keys.seatLock(b.scheduleId, seatId)).catch(() => {});
      emitToTopic(`seat:availability:${b.scheduleId}`, events.seatReleased({
        seatId,
        reason: 'expired',
      }));
    }
  }
  if (didExpire) {
    emitToBooking(bookingId, events.bookingExpired({ bookingId }));
  }
  return didExpire;
}
// ---------- Availability (Session 5) ----------

export async function getAvailability(userId: string, scheduleId: string): Promise<import('./booking.types.js').AvailabilityDTO> {
  const schedule = await repo.findScheduleForLock(scheduleId);
  if (!schedule || schedule.status !== 'PUBLISHED') throw bookingErrors.invalidSchedule();
  if (schedule.departureTime.getTime() <= Date.now()) throw bookingErrors.scheduleDeparted();

  const layout = await repo.findLayoutByBusId(schedule.busId);
  if (!layout) throw bookingErrors.invalidSchedule();

  const fare = await repo.findScheduleFare(scheduleId);
  if (!fare) throw bookingErrors.invalidSchedule();

  const seatRows = await repo.findSeatsWithState(scheduleId, userId);
  const v2 = layoutOfRows(
    layout,
    seatRows.map((s) => ({
      seatRow: s.seat_row, seatColumn: s.seat_column, seatLabel: s.seat_label,
      seatType: s.seat_type, isFemaleOnly: s.is_female_only, seatKey: s.seat_key,
    })),
  );

  return {
    schedule: {
      id: scheduleId,
      fare: { amountPaise: Number(fare.fareAmountPaise), currency: fare.fareCurrency },
    },
    layout: {
      rowsCount: layout.rowsCount,
      columnsCount: layout.columnsCount,
      aisleCells: legacyAisleCells(v2),
      rev: layout.layoutRev,
      spec: compactLayout(v2),
    },
    seats: seatRows.map((s) => ({
      id: s.id,
      key: s.seat_key ?? s.seat_label,
      label: s.seat_label,
      row: s.seat_row,
      column: s.seat_column,
      type: s.seat_type as 'SEATER' | 'SLEEPER' | 'SEMI_SLEEPER',
      isFemaleOnly: s.is_female_only,
      state: s.state as 'AVAILABLE' | 'LOCKED' | 'MINE' | 'BOOKED',
      lockedUntil: s.expires_at?.toISOString() ?? null,
    })),
  };
}

// ---------- Ticket (Session 5) ----------

export async function getTicket(userId: string, bookingId: string): Promise<import('./booking.types.js').TicketDTO> {
  const b = await prisma.booking.findFirst({ where: { id: bookingId, userId, deletedAt: null }, select: { id: true } });
  if (!b) throw bookingErrors.notFound();
  const ticket = await prisma.ticket.findUnique({ where: { bookingId } });
  if (!ticket) throw bookingErrors.ticketNotIssued();
  return {
    ticketId: ticket.id,
    bookingId: ticket.bookingId,
    qrPayload: `v1:${ticket.qrPayload}:${ticket.qrSignature}`,
    status: ticket.status as any,
    issuedAt: ticket.issuedAt.toISOString(),
  };
}

// ---------- Invoice number (Session 5 — used by mock-confirm) ----------

export async function nextInvoiceNumber(tx: { $queryRawUnsafe: <T>(q: string) => Promise<T> }): Promise<string> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const fullYear = now.getFullYear();
  const fyStart = month >= 4 ? fullYear : fullYear - 1;
  const fyEnd = fyStart + 1;
  const fyEndShort = fyEnd % 100;
  const seqName = `invoice_number_seq_${fyStart}_${String(fyEndShort).padStart(2, '0')}`;
  const rows = await tx.$queryRawUnsafe<Array<{ nextval: bigint }>>(`SELECT nextval('${seqName}'::regclass)`);
  const n = Number(rows[0]!.nextval);
  return `INV/${fyStart}-${String(fyEndShort).padStart(2, '0')}/${String(n).padStart(5, '0')}`;
}