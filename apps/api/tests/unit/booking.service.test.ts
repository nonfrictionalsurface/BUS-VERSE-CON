import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createPassenger } from '../helpers/factories.js';
import { seedBookingScenario } from '../helpers/network-factories.js';
import { newUuid } from '../../src/lib/ids.js';
import { acquireSeatLock } from '../../src/modules/booking/seat-lock.service.js';
import {
  createBooking, previewRefund, cancelBooking,
  expirePendingBooking, listMyBookings, getMyBooking,
} from '../../src/modules/booking/booking.service.js';
import { issueTicket } from '../../src/modules/booking/ticket.service.js';
import { parseWireFormat } from '../../src/lib/qr.js';
import { verify } from '../../src/lib/ed25519.js';

const HOUR = 3_600_000;
const TRIP_DURATION_H = 8;

beforeEach(async () => {
  await resetIdentityTables();
});

async function scenario() {
  const seed = await seedBookingScenario({ bookingCount: 0 });
  await prisma.schedule.update({
    where: { id: seed.schedule.id },
    data: {
      departureTime: new Date(Date.now() + 2 * HOUR),
      arrivalTime: new Date(Date.now() + 10 * HOUR),
    },
  });
  const user1 = await createPassenger({ phone: '+919999000001' });
  return { seed, user1 };
}

async function makePendingBooking(
  seed: Awaited<ReturnType<typeof scenario>>['seed'],
  userId: string,
  seatCount = 1,
) {
  const seats = seed.seats.slice(0, seatCount);
  for (const s of seats) {
    await acquireSeatLock(userId, { scheduleId: seed.schedule.id, seatId: s.id });
  }
  const lock = await prisma.seatLock.findFirst({
    where: { userId, scheduleId: seed.schedule.id, deletedAt: null },
    orderBy: { acquiredAt: 'asc' },
  });
  const created = await createBooking(userId, {
    lockId: lock!.id,
    boardingStandId: seed.stand1.id,
    droppingStandId: seed.stand2.id,
    passengers: seats.map((s, i) => ({ seatId: s.id, name: `Passenger ${i + 1}` })),
  });
  return { ...created, seats };
}

describe('createBooking', () => {
  it('creates PENDING booking, extends lock to 15 min (G1 Postgres side)', async () => {
    const { seed, user1 } = await scenario();
    const created = await makePendingBooking(seed, user1.id, 1);
    expect(created.status).toBe('PENDING');
    expect(created.bookingReference).toMatch(/^BKG-\d{4}-\d{5}$/);
    const booking = await prisma.booking.findUnique({ where: { id: created.bookingId } });
    expect(booking!.status).toBe('PENDING');
    const lock = await prisma.seatLock.findFirst({ where: { userId: user1.id } });
    const remaining = lock!.expiresAt.getTime() - Date.now();
    expect(remaining).toBeGreaterThan(14 * 60_000);
  });

  it('rejects when lockId does not belong to user → LOCK_NOT_FOUND', async () => {
    const { seed, user1 } = await scenario();
    const other = await createPassenger({ phone: '+919999000099' });
    await makePendingBooking(seed, user1.id, 1);
    const lock = await prisma.seatLock.findFirst({ where: { userId: user1.id } });
    await expect(
      createBooking(other.id, {
        lockId: lock!.id,
        boardingStandId: seed.stand1.id,
        droppingStandId: seed.stand2.id,
        passengers: [{ seatId: seed.seats[0]!.id, name: 'Mallory' }],
      }),
    ).rejects.toMatchObject({ code: 'LOCK_NOT_FOUND' });
  });

  it('rejects when a lock in the set has expired → LOCK_EXPIRED (all-or-nothing)', async () => {
    const { seed, user1 } = await scenario();
    await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seed.seats[0]!.id });
    await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seed.seats[1]!.id });
    await prisma.seatLock.updateMany({
      where: { userId: user1.id, seatId: seed.seats[1]!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const lock = await prisma.seatLock.findFirst({
      where: { userId: user1.id, seatId: seed.seats[0]!.id },
    });
    await expect(
      createBooking(user1.id, {
        lockId: lock!.id,
        boardingStandId: seed.stand1.id,
        droppingStandId: seed.stand2.id,
        passengers: [
          { seatId: seed.seats[0]!.id, name: 'Alice' },
          { seatId: seed.seats[1]!.id, name: 'Bob' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'LOCK_EXPIRED' });
    expect(await prisma.booking.count({ where: { userId: user1.id } })).toBe(0);
  });

  it('rejects on departed schedule → SCHEDULE_DEPARTED', async () => {
    const { seed, user1 } = await scenario();
    await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seed.seats[0]!.id });
    // departure = now - 1h; arrival stays at now+10h → both valid for CHECK
    await prisma.schedule.update({
      where: { id: seed.schedule.id },
      data: { departureTime: new Date(Date.now() - HOUR) },
    });
    const lock = await prisma.seatLock.findFirst({ where: { userId: user1.id } });
    await expect(
      createBooking(user1.id, {
        lockId: lock!.id,
        boardingStandId: seed.stand1.id,
        droppingStandId: seed.stand2.id,
        passengers: [{ seatId: seed.seats[0]!.id, name: 'Alice' }],
      }),
    ).rejects.toMatchObject({ code: 'SCHEDULE_DEPARTED' });
  });
});

describe('previewRefund — tier boundaries (shared/02 §10)', () => {
  async function previewAt(hoursUntilDeparture: number) {
    const { seed, user1 } = await scenario();
    // Bug A fix: update BOTH departureTime and arrivalTime so chk_schedules_times holds
    const dep = new Date(Date.now() + hoursUntilDeparture * HOUR);
    const arr = new Date(dep.getTime() + TRIP_DURATION_H * HOUR);
    await prisma.schedule.update({
      where: { id: seed.schedule.id },
      data: { departureTime: dep, arrivalTime: arr },
    });
    const { bookingId } = await makePendingBooking(seed, user1.id, 1);
    return previewRefund(user1.id, bookingId);
  }

  it('TIER_FULL when ≥24h to departure', async () => {
    const p = await previewAt(25);
    expect(p.tier).toBe('TIER_FULL');
    expect(p.totalRefundPaise).toBe(p.totalPaidPaise);
  });

  it('TIER_75 when 12h ≤ t < 24h', async () => {
    const p = await previewAt(18);
    expect(p.tier).toBe('TIER_75');
    expect(p.feeRefundPaise).toBe(1500);
    expect(p.totalRefundPaise).toBeLessThan(p.totalPaidPaise);
  });

  it('TIER_50 when 2h ≤ t < 12h', async () => {
    const p = await previewAt(6);
    expect(p.tier).toBe('TIER_50');
    expect(p.feeRefundPaise).toBe(1500);
  });

  it('TIER_ZERO when 0 < t < 2h (fee only)', async () => {
    const p = await previewAt(1);
    expect(p.tier).toBe('TIER_ZERO');
    expect(p.fareRefundPaise).toBe(0);
    expect(p.taxRefundPaise).toBe(0);
    expect(p.feeRefundPaise).toBe(1500);
    expect(p.totalRefundPaise).toBe(1500);
  });

  it('TIER_NOT_ELIGIBLE after departure', async () => {
    const { seed, user1 } = await scenario();
    await acquireSeatLock(user1.id, { scheduleId: seed.schedule.id, seatId: seed.seats[0]!.id });
    const lock = await prisma.seatLock.findFirst({ where: { userId: user1.id } });
    const { bookingId } = await createBooking(user1.id, {
      lockId: lock!.id,
      boardingStandId: seed.stand1.id,
      droppingStandId: seed.stand2.id,
      passengers: [{ seatId: seed.seats[0]!.id, name: 'Alice' }],
    });
    // departure = now - 1h; arrival stays at now+10h → CHECK valid
    await prisma.schedule.update({
      where: { id: seed.schedule.id },
      data: { departureTime: new Date(Date.now() - HOUR) },
    });
    const p = await previewRefund(user1.id, bookingId);
    expect(p.tier).toBe('TIER_NOT_ELIGIBLE');
    expect(p.totalRefundPaise).toBe(0);
  });
});

describe('cancelBooking', () => {
  async function makeConfirmed(seed: Awaited<ReturnType<typeof scenario>>['seed'], userId: string) {
    const created = await makePendingBooking(seed, userId, 1);
    // Bug B fix: move departure to >24h so cancel tier is TIER_FULL
    const dep = new Date(Date.now() + 25 * HOUR);
    const arr = new Date(dep.getTime() + TRIP_DURATION_H * HOUR);
    await prisma.schedule.update({
      where: { id: seed.schedule.id },
      data: { departureTime: dep, arrivalTime: arr },
    });
    await prisma.booking.update({
      where: { id: created.bookingId },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    await prisma.payment.create({
      data: {
        bookingId: created.bookingId,
        idempotencyKey: newUuid(),
        gateway: 'RAZORPAY',
        amountPaise: BigInt(created.totalFarePaise),
        status: 'SUCCEEDED',
        succeededAt: new Date(),
      },
    });
    return created;
  }

  it('cancels CONFIRMED booking, creates refund row, flips booking to CANCELLED', async () => {
    const { seed, user1 } = await scenario();
    const { bookingId } = await makeConfirmed(seed, user1.id);
    const result = await cancelBooking(user1.id, bookingId);
    expect(result.status).toBe('CANCELLED');
    expect(result.refund.tier).toBe('TIER_FULL');
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking!.status).toBe('CANCELLED');
    const refund = await prisma.refund.findFirst({ where: { payment: { bookingId } } });
    expect(refund!.status).toBe('INITIATED');
    expect(refund!.refundTier).toBe('TIER_FULL');
  });

  it('rejects cancel on PENDING booking → INVALID_TRANSITION', async () => {
    const { seed, user1 } = await scenario();
    const { bookingId } = await makePendingBooking(seed, user1.id, 1);
    await expect(cancelBooking(user1.id, bookingId)).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });
});

describe('expirePendingBooking (TV-11)', () => {
  it('PENDING → EXPIRED, soft-deletes passengers, releases locks (G4)', async () => {
    const { seed, user1 } = await scenario();
    const { bookingId, seats } = await makePendingBooking(seed, user1.id, 1);
    const didExpire = await expirePendingBooking(bookingId);
    expect(didExpire).toBe(true);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(booking!.status).toBe('EXPIRED');
    expect(booking!.expiredAt).not.toBeNull();
    const bp = await prisma.bookingPassenger.findFirst({ where: { bookingId } });
    expect(bp!.deletedAt).not.toBeNull();
    expect(await prisma.seatLock.count({ where: { userId: user1.id, seatId: seats[0]!.id } })).toBe(0);
  });

  it('idempotent — non-PENDING booking returns false, no state change', async () => {
    const { seed, user1 } = await scenario();
    const { bookingId } = await makePendingBooking(seed, user1.id, 1);
    await expirePendingBooking(bookingId);
    const second = await expirePendingBooking(bookingId);
    expect(second).toBe(false);
  });
});

describe('issueTicket', () => {
  it('creates ticket with Ed25519-signed wire format that verifies', async () => {
    const { seed, user1 } = await scenario();
    const { bookingId, seats } = await makePendingBooking(seed, user1.id, 1);
    const result = await prisma.$transaction(async (tx) =>
      issueTicket(tx, {
        bookingId,
        scheduleId: seed.schedule.id,
        boardingStandId: seed.stand1.id,
        passengers: [{ seatId: seats[0]!.id, seatLabel: 'A1', name: 'Alice Gupta' }],
      }),
    );
    expect(result.wireFormat).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    const parsed = parseWireFormat(result.wireFormat);
    expect(parsed.payload.bookingId).toBe(bookingId);
    expect(parsed.payload.passengerCount).toBe(1);
    expect(await verify(parsed.signature, parsed.canonicalBytes)).toBe(true);
    const ticket = await prisma.ticket.findUnique({ where: { bookingId } });
    expect(ticket!.status).toBe('ISSUED');
    expect(ticket!.qrPayload).toBe(result.qrPayload);
  });
});

describe('list + get', () => {
  it('listMyBookings returns user bookings only', async () => {
    const { seed, user1 } = await scenario();
    await makePendingBooking(seed, user1.id, 1);
    const other = await createPassenger({ phone: '+919999000099' });
    const result = await listMyBookings(other.id, { limit: 20 });
    expect(result.data.length).toBe(0);
  });

  it('getMyBooking returns full detail with expiresAt for PENDING', async () => {
    const { seed, user1 } = await scenario();
    const { bookingId } = await makePendingBooking(seed, user1.id, 1);
    const detail = await getMyBooking(user1.id, bookingId);
    expect(detail.status).toBe('PENDING');
    expect(detail.expiresAt).not.toBeNull();
    expect(detail.passengerCount).toBe(1);
  });
});