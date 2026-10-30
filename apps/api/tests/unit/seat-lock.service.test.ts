import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { redis, keys } from '../../src/lib/redis.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createPassenger } from '../helpers/factories.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import {
  acquireSeatLock,
  listActiveLocks,
  releaseSeatLock,
} from '../../src/modules/booking/seat-lock.service.js';

beforeEach(async () => {
  await resetIdentityTables();
  await prisma.schedule.deleteMany({});
  await prisma.routeStand.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.seat.deleteMany({});
  await prisma.seatLayout.deleteMany({});
  await prisma.bus.deleteMany({});
  await prisma.stand.deleteMany({});
  await prisma.city.deleteMany({});
});

async function scenario() {
  const seed = await seedBookingScenario({ bookingCount: 0 });
  // seedBookingScenario seeds "today 08:00 IST" as departure, which may already be in the past.
  // Advance to now+2h so acquireSeatLock's departure check passes.
  await prisma.schedule.update({
    where: { id: seed.schedule.id },
    data: {
      departureTime: new Date(Date.now() + 2 * 3600_000),
      arrivalTime: new Date(Date.now() + 10 * 3600_000),
    },
  });
  const user1 = await createPassenger({ phone: '+919999000001' });
  const user2 = await createPassenger({ phone: '+919999000002' });
  return { seed, user1, user2 };
}

describe('acquireSeatLock', () => {
  it('acquires on a published schedule with matching seat', async () => {
    const { seed, user1 } = await scenario();
    const seat = seed.seats[0]!;
    const lock = await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    expect(lock.lockId).toBeTruthy();
    expect(lock.seatLabel).toBe('A1');
    expect(lock.remainingSeconds).toBeGreaterThan(280);
    expect(await prisma.seatLock.count({ where: { id: lock.lockId } })).toBe(1);
  });

  it('idempotent — same user same seat returns the existing lock (200 path)', async () => {
    const { seed, user1 } = await scenario();
    const seat = seed.seats[0]!;
    const a = await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    const b = await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    expect(b.lockId).toBe(a.lockId);
    expect(await prisma.seatLock.count({ where: { userId: user1.id } })).toBe(1);
  });

  it('different user on a locked seat → SEAT_LOCKED', async () => {
    const { seed, user1, user2 } = await scenario();
    const seat = seed.seats[0]!;
    await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    await expect(
      acquireSeatLock(user2.id, { scheduleId: seed.schedule.id, seatId: seat.id }),
    ).rejects.toMatchObject({ code: 'SEAT_LOCKED' });
  });

  it('DRAFT schedule → INVALID_SCHEDULE', async () => {
    const { seed, user1 } = await scenario();
    await prisma.schedule.update({ where: { id: seed.schedule.id }, data: { status: 'DRAFT' } });
    await expect(
      acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seed.seats[0]!.id }),
    ).rejects.toMatchObject({ code: 'INVALID_SCHEDULE' });
  });

  it('departed schedule → SCHEDULE_DEPARTED', async () => {
    const { seed, user1 } = await scenario();
    await prisma.schedule.update({
      where: { id: seed.schedule.id },
      data: { departureTime: new Date(Date.now() - 3600_000) },
    });
    await expect(
      acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seed.seats[0]!.id }),
    ).rejects.toMatchObject({ code: 'SCHEDULE_DEPARTED' });
  });

  it('seat on a different bus → INVALID_SEAT', async () => {
    const { seed, user1 } = await scenario();
    // Build a second bus + layout + seat under the same operator (no second seedBookingScenario call)
    const otherBus = await prisma.bus.create({
      data: {
        operatorId: seed.operatorId,
        registrationNumber: `MH-${Date.now()}-X`,
        capacity: 1,
        busType: 'AC_SEATER',
        amenitiesJson: { _v: 1, items: [] },
        approvalStatus: 'APPROVED',
      },
    });
    const otherLayout = await prisma.seatLayout.create({
      data: {
        busId: otherBus.id,
        rowsCount: 1,
        columnsCount: 1,
        aisleMapJson: { _v: 1, aisle_cells: [] },
      },
    });
    const otherSeat = await prisma.seat.create({
      data: {
        layoutId: otherLayout.id,
        seatRow: 'A',
        seatColumn: 1,
        seatLabel: 'A1',
        seatType: 'SEATER',
        isFemaleOnly: false,
      },
    });
    await expect(
      acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: otherSeat.id }),
    ).rejects.toMatchObject({ code: 'INVALID_SEAT' });
  });

  it('seat with active CONFIRMED booking → SEAT_ALREADY_BOOKED', async () => {
    const { seed, user1 } = await scenario();
    const booking = await prisma.booking.create({
      data: {
        bookingReference: `BKG-${Date.now()}`,
        userId: user1.id,
        scheduleId: seed.schedule.id,
        boardingStandId: seed.stand1.id,
        droppingStandId: seed.stand2.id,
        totalFareAmount: 45000n,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });
    const seat = seed.seats[0]!;
    await prisma.bookingPassenger.create({
      data: { bookingId: booking.id, seatId: seat.id, scheduleId: seed.schedule.id, name: 'Alice' },
    });
    await expect(
      acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seat.id }),
    ).rejects.toMatchObject({ code: 'SEAT_ALREADY_BOOKED' });
  });

  it('G7 — cancelled booking does NOT block the seat', async () => {
    const { seed, user1 } = await scenario();
    const booking = await prisma.booking.create({
      data: {
        bookingReference: `BKG-${Date.now()}`,
        userId: user1.id,
        scheduleId: seed.schedule.id,
        boardingStandId: seed.stand1.id,
        droppingStandId: seed.stand2.id,
        totalFareAmount: 45000n,
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
    const seat = seed.seats[0]!;
    await prisma.bookingPassenger.create({
      data: { bookingId: booking.id, seatId: seat.id, scheduleId: seed.schedule.id, name: 'Alice' },
    });
    const lock = await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    expect(lock.lockId).toBeTruthy();
  });
});

describe('releaseSeatLock', () => {
  it('deletes the lock from DB and Redis', async () => {
    const { seed, user1 } = await scenario();
    const seat = seed.seats[0]!;
    const lock = await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    await releaseSeatLock(user1.id, lock.lockId);
    expect(await prisma.seatLock.count({ where: { id: lock.lockId } })).toBe(0);
    expect(await redis.get(keys.seatLock(seed.schedule.id, seat.id))).toBeNull();
  });

  it('idempotent — releasing twice is a no-op the second time', async () => {
    const { seed, user1 } = await scenario();
    const seat = seed.seats[0]!;
    const lock = await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    await releaseSeatLock(user1.id, lock.lockId);
    await expect(releaseSeatLock(user1.id, lock.lockId)).resolves.toBeUndefined();
  });

  it('wrong user → LOCK_NOT_FOUND (row-scope)', async () => {
    const { seed, user1, user2 } = await scenario();
    const seat = seed.seats[0]!;
    const lock = await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    await expect(releaseSeatLock(user2.id, lock.lockId)).rejects.toMatchObject({
      code: 'LOCK_NOT_FOUND',
    });
  });
});

describe('listActiveLocks', () => {
  it('returns only my active locks, ordered by expiry', async () => {
    const { seed, user1, user2 } = await scenario();
    await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seed.seats[0]!.id });
    await acquireSeatLock(user2.id, { scheduleId: seed.schedule.id, seatId: seed.seats[1]!.id });
    const mine = await listActiveLocks(user1.id);
    expect(mine.length).toBe(1);
    expect(mine[0]!.seatLabel).toBe('A1');
  });

  it('excludes expired locks', async () => {
    const { seed, user1 } = await scenario();
    const seat = seed.seats[0]!;
    const lock = await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    await prisma.seatLock.update({
      where: { id: lock.lockId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await listActiveLocks(user1.id)).length).toBe(0);
  });
});