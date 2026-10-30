import * as events from '../../realtime/events.js';
import { emitToTopic } from '../../realtime/emit.js';
import { redis, keys } from '../../lib/redis.js';
import { mapDbConnectionError } from '../../lib/db-errors.js';
import { bookingErrors } from './booking.errors.js';
import * as repo from './booking.repository.js';
import { LOCK_TTL_SECONDS, type SeatLockDTO } from './booking.types.js';

function remainingSeconds(expiresAt: Date): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
}

function mapLock(
  row: { id: string; expiresAt: Date },
  seatLabel: string,
  scheduleId: string,
  seatId: string,
): SeatLockDTO {
  return {
    lockId: row.id,
    scheduleId,
    seatId,
    seatLabel,
    expiresAt: row.expiresAt.toISOString(),
    remainingSeconds: remainingSeconds(row.expiresAt),
  };
}

export async function acquireSeatLock(
  userId: string,
  params: { scheduleId: string; seatId: string },
): Promise<SeatLockDTO> {
  // Layer 0 — input validation
  const schedule = await repo.findScheduleForLock(params.scheduleId);
  if (!schedule || schedule.status !== 'PUBLISHED') throw bookingErrors.invalidSchedule();
  if (schedule.departureTime.getTime() <= Date.now()) throw bookingErrors.scheduleDeparted();

  const seat = await repo.findSeatForLock(params.seatId);
  if (!seat) throw bookingErrors.invalidSeat();
  if (seat.layout.busId !== schedule.busId) throw bookingErrors.invalidSeat();

  // G11 — idempotent same-user re-acquire
  const existing = await repo.findExistingActiveLock({
    userId,
    scheduleId: params.scheduleId,
    seatId: params.seatId,
  });
  if (existing) return mapLock(existing, seat.seatLabel, params.scheduleId, params.seatId);

  // Layer 1 — pre-check for active booking (G7)
  if (await repo.isSeatBooked(params.scheduleId, params.seatId)) {
    throw bookingErrors.seatAlreadyBooked(params.seatId);
  }

  // Layer 2 — Redis SET NX (degrades gracefully if Redis is down, §13.3)
  const redisKey = keys.seatLock(params.scheduleId, params.seatId);
  let redisAcquired = false;
  let redisError = false;
  try {
    const res = await redis.set(redisKey, userId, 'EX', LOCK_TTL_SECONDS, 'NX');
    redisAcquired = res === 'OK';
  } catch {
    redisError = true;
  }
  if (!redisAcquired && !redisError) throw bookingErrors.seatLocked(params.seatId);

  // Layer 3 — Postgres transaction
  let result: repo.AcquireResult;
  try {
    result = await repo.tryAcquireLock({
      scheduleId: params.scheduleId,
      seatId: params.seatId,
      userId,
    });
  } catch (err) {
    if (redisAcquired) await redis.del(redisKey).catch(() => {});
    throw mapDbConnectionError(err);
  }
  if (result.kind === 'booked') {
    if (redisAcquired) await redis.del(redisKey).catch(() => {});
    throw bookingErrors.seatAlreadyBooked(params.seatId);
  }
  if (result.kind === 'locked') {
    if (redisAcquired) await redis.del(redisKey).catch(() => {});
    throw bookingErrors.seatLocked(params.seatId);
  }

  // Best-effort repopulate Redis if it was down
  if (redisError) {
    await redis.set(redisKey, userId, 'EX', LOCK_TTL_SECONDS).catch(() => {});
  }

  const dto = mapLock(result.lock, seat.seatLabel, params.scheduleId, params.seatId);
  emitToTopic(`seat:availability:${params.scheduleId}`, events.seatLocked({
    seatId: params.seatId,
    lockedUntil: dto.expiresAt,
    lockedByMe: false,
  }));
  return dto;
}
export async function listActiveLocks(userId: string): Promise<SeatLockDTO[]> {
  const rows = await repo.listActiveLocksForUser(userId);
  return rows.map((r) => ({
    lockId: r.id,
    scheduleId: r.scheduleId,
    seatId: r.seatId,
    seatLabel: r.seat.seatLabel,
    expiresAt: r.expiresAt.toISOString(),
    remainingSeconds: remainingSeconds(r.expiresAt),
  }));
}

export async function releaseSeatLock(userId: string, lockId: string): Promise<void> {
  const result = await repo.deleteLockByIdAndUser(lockId, userId);
  if (result.kind === 'forbidden') throw bookingErrors.lockNotFound();
  if (result.kind === 'deleted') {
    // G6: Redis DEL
    await redis.del(keys.seatLock(result.scheduleId, result.seatId)).catch(() => {});
    emitToTopic(`seat:availability:${result.scheduleId}`, events.seatReleased({
      seatId: result.seatId,
      reason: 'manual',
    }));
  }
  // 'gone' → caller returns 204, no error
}