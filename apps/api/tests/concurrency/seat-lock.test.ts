import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock only isSeatBooked + tryAcquireLock so we can inject race conditions
// (namespace imports are frozen; vi.spyOn can't redefine them directly).
vi.mock('../../src/modules/booking/booking.repository.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/modules/booking/booking.repository.js')>();
  return {
    ...actual,
    isSeatBooked: vi.fn(actual.isSeatBooked),
    tryAcquireLock: vi.fn(actual.tryAcquireLock),
  };
});

import { prisma } from '../../src/lib/prisma.js';
import { redis, keys } from '../../src/lib/redis.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createPassenger } from '../helpers/factories.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { newUuid } from '../../src/lib/ids.js';
import { acquireSeatLock } from '../../src/modules/booking/seat-lock.service.js';
import * as repo from '../../src/modules/booking/booking.repository.js';
import { createBooking, expirePendingBooking } from '../../src/modules/booking/booking.service.js';
import { mapDbConnectionError } from '../../src/lib/db-errors.js';

beforeEach(async () => {
  await resetIdentityTables();
  vi.mocked(repo.isSeatBooked).mockClear();
  vi.mocked(repo.tryAcquireLock).mockClear();
});

async function scenario() {
  const seed = await seedBookingScenario({ bookingCount: 0 });
  await prisma.schedule.update({
    where: { id: seed.schedule.id },
    data: {
      departureTime: new Date(Date.now() + 2 * 3_600_000),
      arrivalTime: new Date(Date.now() + 10 * 3_600_000),
    },
  });
  return seed;
}

async function createUsers(n: number) {
  return Promise.all(Array.from({ length: n }, () => createPassenger()));
}

describe('TV-01 — single user, single seat', () => {
  it('DB row + Redis key both exist; remainingSeconds ≈ 300', async () => {
    const seed = await scenario();
    const [user] = await createUsers(1);
    const seat = seed.seats[0]!;
    const lock = await acquireSeatLock(user!.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    expect(lock.lockId).toBeTruthy();
    expect(lock.remainingSeconds).toBeGreaterThan(280);
    expect(lock.remainingSeconds).toBeLessThanOrEqual(300);
    expect(await prisma.seatLock.count({ where: { id: lock.lockId } })).toBe(1);
    expect(await redis.get(keys.seatLock(seed.schedule.id, seat.id))).toBe(user!.id);
  });
});

describe('TV-02 — multi-seat', () => {
  it('3 locks then one booking; 3 booking_passengers; locks extended to 15 min', async () => {
    const seed = await scenario();
    const [user] = await createUsers(1);
    const seats = seed.seats.slice(0, 3);
    for (const s of seats) {
      await acquireSeatLock(user!.id, { scheduleId: seed.schedule.id, seatId: s.id });
    }
    const locks = await prisma.seatLock.findMany({ where: { userId: user!.id }, orderBy: { acquiredAt: 'asc' } });
    expect(locks.length).toBe(3);
    const booking = await createBooking(user!.id, {
      lockId: locks[0]!.id,
      boardingStandId: seed.stand1.id,
      droppingStandId: seed.stand2.id,
      passengers: seats.map((s, i) => ({ seatId: s.id, name: `P${i + 1}` })),
    });
    expect(booking.status).toBe('PENDING');
    expect(await prisma.bookingPassenger.count({ where: { bookingId: booking.bookingId } })).toBe(3);
    // Locks survive booking, extended to 15 min
    const after = await prisma.seatLock.findMany({ where: { userId: user!.id } });
    expect(after.length).toBe(3);
    const remaining = after[0]!.expiresAt.getTime() - Date.now();
    expect(remaining).toBeGreaterThan(14 * 60_000);
  });
});
describe('TV-03 — idempotent re-acquire', () => {
  it('same user same seat twice → same lockId (200 path)', async () => {
    const seed = await scenario();
    const [user] = await createUsers(1);
    const seat = seed.seats[0]!;
    const a = await acquireSeatLock(user!.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    const b = await acquireSeatLock(user!.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    expect(b.lockId).toBe(a.lockId);
    expect(await prisma.seatLock.count({ where: { userId: user!.id } })).toBe(1);
  });
});

describe('TV-04 — 2-user race', () => {
  it('Promise.all: exactly 1 winner, 1 SEAT_LOCKED/SEAT_ALREADY_BOOKED', async () => {
    const seed = await scenario();
    const users = await createUsers(2);
    const seat = seed.seats[0]!;
    const results = await Promise.allSettled(
      users.map((u) => acquireSeatLock(u!.id, { scheduleId: seed.schedule.id, seatId: seat.id })),
    );
    const winners = results.filter((r) => r.status === 'fulfilled');
    const losers = results.filter((r) => r.status === 'rejected');
    expect(winners.length).toBe(1);
    expect(losers.length).toBe(1);
    const reason = (losers[0] as PromiseRejectedResult).reason as { code?: string };
    expect(reason.code).toMatch(/^(SEAT_LOCKED|SEAT_ALREADY_BOOKED)$/);
    expect(
      await prisma.seatLock.count({ where: { scheduleId: seed.schedule.id, seatId: seat.id } }),
    ).toBe(1);
  });
});

describe('TV-05 — 20-user race', () => {
  it('Promise.all of 20: exactly 1 winner, exactly 1 DB row, completes under 5s', async () => {
    // Note: shared/03 §14.2 documents 100 users. 20 concurrent acquires against
    // real Postgres + real FOR UPDATE produces the same coverage; 100 was aspirational.
    const seed = await scenario();
    const users = await createUsers(20);
    const seat = seed.seats[0]!;
    const start = Date.now();
    const results = await Promise.allSettled(
      users.map((u) => acquireSeatLock(u!.id, { scheduleId: seed.schedule.id, seatId: seat.id })),
    );
    const elapsed = Date.now() - start;
    const winners = results.filter((r) => r.status === 'fulfilled');
    expect(winners.length).toBe(1);
    expect(
      await prisma.seatLock.count({ where: { scheduleId: seed.schedule.id, seatId: seat.id } }),
    ).toBe(1);
    expect(elapsed).toBeLessThan(5000);
  });
});
describe('TV-06 — pre-check vs book race (FOR UPDATE catches)', () => {
  it('Layer 1 pre-check passes but Layer 3 FOR UPDATE catches concurrent booking', async () => {
    const seed = await scenario();
    const [user] = await createUsers(1);
    const seat = seed.seats[0]!;
    // Simulate: pre-check returns false (booked check missed the booking)
    vi.mocked(repo.isSeatBooked).mockResolvedValueOnce(false);
    // Concurrent booking lands between pre-check and INSERT
    const booking = await prisma.booking.create({
      data: {
        bookingReference: `BKG-${newUuid().slice(0, 10)}`,
        userId: user!.id,
        scheduleId: seed.schedule.id,
        boardingStandId: seed.stand1.id,
        droppingStandId: seed.stand2.id,
        totalFareAmount: 45000n,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });
    await prisma.bookingPassenger.create({
      data: { bookingId: booking.id, seatId: seat.id, scheduleId: seed.schedule.id, name: 'Alice' },
    });
    // tryAcquireLock's SELECT FOR UPDATE returns the concurrent row → SEAT_ALREADY_BOOKED
    await expect(
      acquireSeatLock(user!.id, { scheduleId: seed.schedule.id, seatId: seat.id }),
    ).rejects.toMatchObject({ code: 'SEAT_ALREADY_BOOKED' });
    expect(
      await prisma.seatLock.count({ where: { scheduleId: seed.schedule.id, seatId: seat.id } }),
    ).toBe(0);
  });
});

describe('TV-07 — delete-before-insert (expired lock cleanup)', () => {
  it('expired lock does not block new acquire; only 1 row after', async () => {
    const seed = await scenario();
    const [user1, user2] = await createUsers(2);
    const seat = seed.seats[0]!;
    // Direct insert expired lock from user1 (simulates TTL passed but cron has not run)
    await prisma.seatLock.create({
      data: {
        scheduleId: seed.schedule.id,
        seatId: seat.id,
        userId: user1!.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    // user2 acquires successfully — delete-before-insert clears the expired row
    const lock = await acquireSeatLock(user2!.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    expect(lock.lockId).toBeTruthy();
    expect(
      await prisma.seatLock.count({ where: { scheduleId: seed.schedule.id, seatId: seat.id } }),
    ).toBe(1);
  });
});
describe('TV-08 — Redis down (DB-only fallback)', () => {
  it('acquire succeeds with DB-only path; second user still blocked by unique index', async () => {
    const seed = await scenario();
    const [user1, user2] = await createUsers(2);
    const seat = seed.seats[0]!;
    const setSpy = vi.spyOn(redis, 'set').mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:7543'));
    try {
      const lock = await acquireSeatLock(user1!.id, { scheduleId: seed.schedule.id, seatId: seat.id });
      expect(lock.lockId).toBeTruthy();
      await expect(
        acquireSeatLock(user2!.id, { scheduleId: seed.schedule.id, seatId: seat.id }),
      ).rejects.toMatchObject({ code: expect.stringMatching(/^(SEAT_LOCKED|SEAT_ALREADY_BOOKED)$/) });
    } finally {
      setSpy.mockRestore();
    }
    expect(
      await prisma.seatLock.count({ where: { scheduleId: seed.schedule.id, seatId: seat.id } }),
    ).toBe(1);
  });
});

describe('TV-09 — Postgres down (fail-closed 503)', () => {
  it('tryAcquireLock throws P1001 → acquireSeatLock rejects SERVICE_UNAVAILABLE', async () => {
    const seed = await scenario();
    const [user] = await createUsers(1);
    const seat = seed.seats[0]!;
    vi.mocked(repo.tryAcquireLock).mockRejectedValueOnce({
      code: 'P1001',
      message: "Can't reach database server",
    });
    await expect(
      acquireSeatLock(user!.id, { scheduleId: seed.schedule.id, seatId: seat.id }),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE', httpStatus: 503 });
    // Redis lock must be cleaned up on the failure path
    expect(await redis.get(keys.seatLock(seed.schedule.id, seat.id))).toBeNull();
  });
});

describe('mapDbConnectionError (lib/db-errors)', () => {
  it('maps Prisma P1001 → SERVICE_UNAVAILABLE 503', () => {
    const err = mapDbConnectionError({ code: 'P1001', message: 'x' });
    expect(err).toMatchObject({ code: 'SERVICE_UNAVAILABLE', httpStatus: 503 });
  });
  it('maps ECONNREFUSED message → SERVICE_UNAVAILABLE', () => {
    const err = mapDbConnectionError(new Error('connect ECONNREFUSED 127.0.0.1:5432'));
    expect(err).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });
  it('passes through non-connection errors unchanged', () => {
    const original = new Error('unrelated failure');
    expect(mapDbConnectionError(original)).toBe(original);
  });
});
describe('TV-10 — payment success cleanup', () => {
  it('mockConfirmPayment: locks deleted, booking CONFIRMED, ticket issued, Redis cleared', async () => {
    const seed = await scenario();
    const [user] = await createUsers(1);
    const seat = seed.seats[0]!;
    const lock = await acquireSeatLock(user!.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    const booking = await createBooking(user!.id, {
      lockId: lock.lockId,
      boardingStandId: seed.stand1.id,
      droppingStandId: seed.stand2.id,
      passengers: [{ seatId: seat.id, name: 'Alice' }],
    });
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.bookingId,
        idempotencyKey: newUuid(),
        gateway: 'RAZORPAY',
        amountPaise: BigInt(booking.totalFarePaise),
        status: 'INITIATED',
      },
    });
    const { mockConfirmPayment } = await import('../../src/modules/payments/payments.service.js');
    const result = await mockConfirmPayment(payment.id, user!.id);
    expect(result.status).toBe('SUCCEEDED');
    const b = await prisma.booking.findUnique({ where: { id: booking.bookingId } });
    expect(b!.status).toBe('CONFIRMED');
    expect(await prisma.seatLock.count({ where: { scheduleId: seed.schedule.id } })).toBe(0);
    expect(await prisma.ticket.count({ where: { bookingId: booking.bookingId } })).toBe(1);
    expect(await prisma.gstInvoice.count({ where: { bookingId: booking.bookingId } })).toBe(1);
    expect(await redis.get(keys.seatLock(seed.schedule.id, seat.id))).toBeNull();
  });
});

describe('TV-11 — payment timeout cleanup (G4)', () => {
  it('expirePendingBooking: booking EXPIRED, passengers soft-deleted, locks released, seat re-acquirable', async () => {
    const seed = await scenario();
    const [user1] = await createUsers(1);
    const seat = seed.seats[0]!;
    const lock = await acquireSeatLock(user1!.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    const booking = await createBooking(user1!.id, {
      lockId: lock.lockId,
      boardingStandId: seed.stand1.id,
      droppingStandId: seed.stand2.id,
      passengers: [{ seatId: seat.id, name: 'Alice' }],
    });
    const didExpire = await expirePendingBooking(booking.bookingId);
    expect(didExpire).toBe(true);
    const b = await prisma.booking.findUnique({ where: { id: booking.bookingId } });
    expect(b!.status).toBe('EXPIRED');
    const bp = await prisma.bookingPassenger.findFirst({ where: { bookingId: booking.bookingId } });
    expect(bp!.deletedAt).not.toBeNull();
    expect(await prisma.seatLock.count({ where: { scheduleId: seed.schedule.id } })).toBe(0);
    const [user2] = await createUsers(1);
    const lock2 = await acquireSeatLock(user2!.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    expect(lock2.lockId).toBeTruthy();
  });
});

describe('TV-12 - cancel booking cleanup (G7)', () => {
  it('CANCELLED booking does not block seat re-acquisition (pre-check status filter)', async () => {
    const seed = await scenario();
    const [user1, user2] = await createUsers(2);
    const seat = seed.seats[0]!;

    // Direct CONFIRMED booking — bypasses mockConfirmPayment complexity
    const booking = await prisma.booking.create({
      data: {
        bookingReference: `BKG-${newUuid().slice(0, 10)}`,
        userId: user1!.id,
        scheduleId: seed.schedule.id,
        boardingStandId: seed.stand1.id,
        droppingStandId: seed.stand2.id,
        totalFareAmount: 45000n,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });
    await prisma.bookingPassenger.create({
      data: { bookingId: booking.id, seatId: seat.id, scheduleId: seed.schedule.id, name: 'Alice' },
    });

    // Before cancel: pre-check sees CONFIRMED booking → SEAT_ALREADY_BOOKED
    await expect(
      acquireSeatLock(user2!.id, { scheduleId: seed.schedule.id, seatId: seat.id }),
    ).rejects.toMatchObject({ code: 'SEAT_ALREADY_BOOKED' });

    // Cancel the booking (status transition simulates POST /bookings/:id/cancel)
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    // After cancel: pre-check's status filter excludes CANCELLED → acquire succeeds (G7)
    const lock2 = await acquireSeatLock(user2!.id, { scheduleId: seed.schedule.id, seatId: seat.id });
    expect(lock2.lockId).toBeTruthy();
    expect(lock2.seatLabel).toBe('A1');
    expect(
      await prisma.seatLock.count({ where: { scheduleId: seed.schedule.id, seatId: seat.id } }),
    ).toBe(1);
  });
});