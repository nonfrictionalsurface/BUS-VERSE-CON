import { prisma } from '../../lib/prisma.js';
import { LOCK_TTL_SECONDS } from './booking.types.js';

// ---------- Layer 0: input validation queries ----------

export async function findScheduleForLock(scheduleId: string) {
  return prisma.schedule.findFirst({
    where: { id: scheduleId, deletedAt: null },
    select: { id: true, busId: true, status: true, departureTime: true, operatorId: true },
  });
}

export async function findSeatForLock(seatId: string) {
  return prisma.seat.findFirst({
    where: { id: seatId, deletedAt: null },
    select: { id: true, seatLabel: true, layout: { select: { busId: true } } },
  });
}
// ---------- Layer 1: pre-check ----------

export async function findExistingActiveLock(params: {
  userId: string;
  scheduleId: string;
  seatId: string;
}) {
  return prisma.seatLock.findFirst({
    where: {
      userId: params.userId,
      scheduleId: params.scheduleId,
      seatId: params.seatId,
      expiresAt: { gt: new Date() },
      deletedAt: null,
    },
    select: { id: true, expiresAt: true },
  });
}

export async function isSeatBooked(scheduleId: string, seatId: string): Promise<boolean> {
  const row = await prisma.bookingPassenger.findFirst({
    where: {
      scheduleId,
      seatId,
      deletedAt: null,
      booking: {
        status: { notIn: ['CANCELLED', 'OPERATOR_CANCELLED', 'REFUNDED', 'EXPIRED', 'FAILED'] },
        deletedAt: null,
      },
    },
    select: { id: true },
  });
  return row !== null;
}

// ---------- Layer 3: transaction with FOR UPDATE ----------

export type AcquireResult =
  | { kind: 'acquired'; lock: { id: string; expiresAt: Date } }
  | { kind: 'booked' }
  | { kind: 'locked' };

function isPrismaUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { code?: string }).code === 'P2002';
}

export async function tryAcquireLock(params: {
  scheduleId: string;
  seatId: string;
  userId: string;
}): Promise<AcquireResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      // G2: defensive cleanup of expired locks for this (schedule, seat)
      await tx.seatLock.deleteMany({
        where: {
          scheduleId: params.scheduleId,
          seatId: params.seatId,
          expiresAt: { lt: new Date() },
          deletedAt: null,
        },
      });

      // G5/G7: FOR UPDATE re-check — active booking on this seat?
      const conflicting = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT bp.id
        FROM booking_passengers bp
        JOIN bookings b ON bp.booking_id = b.id
        WHERE bp.schedule_id = ${params.scheduleId}::uuid
          AND bp.seat_id = ${params.seatId}::uuid
          AND bp.deleted_at IS NULL
          AND b.deleted_at IS NULL
          AND b.status NOT IN ('CANCELLED','OPERATOR_CANCELLED','REFUNDED','EXPIRED','FAILED')
        LIMIT 1
        FOR UPDATE
      `;
      if (conflicting.length > 0) return { kind: 'booked' as const };

      const lock = await tx.seatLock.create({
        data: {
          scheduleId: params.scheduleId,
          seatId: params.seatId,
          userId: params.userId,
          expiresAt: new Date(Date.now() + LOCK_TTL_SECONDS * 1000),
        },
        select: { id: true, expiresAt: true },
      });
      return { kind: 'acquired' as const, lock };
    });
  } catch (err) {
    if (isPrismaUniqueViolation(err)) return { kind: 'locked' };
    throw err;
  }
}
// ---------- Release + list ----------

export type DeleteLockResult =
  | { kind: 'deleted'; scheduleId: string; seatId: string }
  | { kind: 'gone' }
  | { kind: 'forbidden' };

export async function deleteLockByIdAndUser(lockId: string, userId: string): Promise<DeleteLockResult> {
  const row = await prisma.seatLock.findUnique({
    where: { id: lockId },
    select: { userId: true, scheduleId: true, seatId: true, deletedAt: true },
  });
  if (!row || row.deletedAt) return { kind: 'gone' };
  if (row.userId !== userId) return { kind: 'forbidden' };
  await prisma.seatLock.deleteMany({ where: { id: lockId, userId } });
  return { kind: 'deleted', scheduleId: row.scheduleId, seatId: row.seatId };
}

export async function listActiveLocksForUser(userId: string) {
  return prisma.seatLock.findMany({
    where: { userId, expiresAt: { gt: new Date() }, deletedAt: null },
    orderBy: { expiresAt: 'asc' },
    take: 20,
    select: {
      id: true,
      scheduleId: true,
      seatId: true,
      expiresAt: true,
      seat: { select: { seatLabel: true } },
    },
  });
}
// ---------- Availability (Session 5) ----------

export async function findLayoutByBusId(busId: string) {
  return prisma.seatLayout.findFirst({
    where: { busId, deletedAt: null },
    select: { id: true, rowsCount: true, columnsCount: true, aisleMapJson: true, specJson: true, layoutRev: true },
  });
}

export interface SeatWithState {
  id: string;
  seat_label: string;
  seat_key: string | null;
  seat_row: string;
  seat_column: number;
  seat_type: string;
  is_female_only: boolean;
  state: string;
  expires_at: Date | null;
}

export async function findSeatsWithState(scheduleId: string, userId: string): Promise<SeatWithState[]> {
  return prisma.$queryRaw<SeatWithState[]>`
    SELECT
      se.id,
      se.seat_label,
      se.seat_key,
      se.seat_row,
      se.seat_column,
      se.seat_type,
      se.is_female_only,
      CASE
        WHEN bp.id IS NOT NULL THEN 'BOOKED'
        WHEN sl.user_id = ${userId}::uuid THEN 'MINE'
        WHEN sl.id IS NOT NULL THEN 'LOCKED'
        ELSE 'AVAILABLE'
      END AS state,
      sl.expires_at
    FROM seats se
    JOIN seat_layouts slay ON se.layout_id = slay.id
    JOIN schedules sch ON sch.bus_id = slay.bus_id
    LEFT JOIN seat_locks sl
      ON sl.seat_id = se.id
      AND sl.schedule_id = ${scheduleId}::uuid
      AND sl.expires_at > now()
      AND sl.deleted_at IS NULL
    LEFT JOIN booking_passengers bp
      ON bp.seat_id = se.id
      AND bp.schedule_id = ${scheduleId}::uuid
      AND bp.deleted_at IS NULL
      AND bp.booking_id IN (
        SELECT id FROM bookings
        WHERE status NOT IN ('CANCELLED','OPERATOR_CANCELLED','REFUNDED','EXPIRED','FAILED')
          AND deleted_at IS NULL
      )
    WHERE sch.id = ${scheduleId}::uuid
      AND se.deleted_at IS NULL
    ORDER BY se.seat_row, se.seat_column
  `;
}

export async function findScheduleFare(scheduleId: string) {
  return prisma.schedule.findFirst({
    where: { id: scheduleId, deletedAt: null },
    select: { fareAmountPaise: true, fareCurrency: true },
  });
}