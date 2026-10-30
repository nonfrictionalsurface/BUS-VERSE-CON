import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { resetIdentityTables } from '../helpers/test-db.js';
import { createPassenger } from '../helpers/factories.js';
import { newUuid } from '../../src/lib/ids.js';
import { runPurgeOtpChallenges } from '../../src/workers/jobs/purge-otp-challenges.job.js';
import { runPurgeSessions } from '../../src/workers/jobs/purge-sessions.job.js';

const hoursAgo = (h: number): Date => new Date(Date.now() - h * 3_600_000);
const daysAgo = (d: number): Date => new Date(Date.now() - d * 86_400_000);

beforeEach(async () => { await resetIdentityTables(); });

describe('purge-otp-challenges job', () => {
  it('deletes challenges expired more than 1h ago', async () => {
    const expired = await prisma.otpChallenge.create({
      data: {
        phoneOrEmail: `+91${newUuid().slice(0, 10).replace(/-/g, '')}`.slice(0, 13),
        otpHash: 'a'.repeat(64), otpSalt: 'b'.repeat(16),
        expiresAt: hoursAgo(2),
      },
    });
    const r = await runPurgeOtpChallenges();
    expect(r.deleted).toBeGreaterThanOrEqual(1);
    expect(await prisma.otpChallenge.findUnique({ where: { id: expired.id } })).toBeNull();
  });

  it('keeps challenges expired less than 1h ago', async () => {
    const recent = await prisma.otpChallenge.create({
      data: {
        phoneOrEmail: `+91${newUuid().slice(0, 10).replace(/-/g, '')}`.slice(0, 13),
        otpHash: 'c'.repeat(64), otpSalt: 'd'.repeat(16),
        expiresAt: hoursAgo(0.5),
      },
    });
    await runPurgeOtpChallenges();
    expect(await prisma.otpChallenge.findUnique({ where: { id: recent.id } })).not.toBeNull();
  });
});

describe('purge-sessions job', () => {
  it('deletes sessions older than 180 days', async () => {
    const u = await createPassenger();
    const s = await prisma.session.create({
      data: {
        userId: u.id, role: 'REGISTERED_PASSENGER',
        refreshHash: 'e'.repeat(64), status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: daysAgo(200),
      },
    });
    await runPurgeSessions();
    expect(await prisma.session.findUnique({ where: { id: s.id } })).toBeNull();
  });

  it('keeps sessions younger than 180 days', async () => {
    const u = await createPassenger();
    const s = await prisma.session.create({
      data: {
        userId: u.id, role: 'REGISTERED_PASSENGER',
        refreshHash: 'f'.repeat(64), status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 86_400_000),
        createdAt: daysAgo(10),
      },
    });
    await runPurgeSessions();
    expect(await prisma.session.findUnique({ where: { id: s.id } })).not.toBeNull();
  });
});
describe('purge-password-reset-tokens job', () => {
  it('deletes tokens expired more than 1h ago', async () => {
    const u = await createPassenger();
    const t = await prisma.passwordResetToken.create({
      data: { userId: u.id, tokenHash: 'g'.repeat(64), expiresAt: hoursAgo(2) },
    });
    await (await import('../../src/workers/jobs/purge-password-reset-tokens.job.js')).runPurgePasswordResetTokens();
    expect(await prisma.passwordResetToken.findUnique({ where: { id: t.id } })).toBeNull();
  });

  it('deletes tokens used more than 24h ago', async () => {
    const u = await createPassenger();
    const t = await prisma.passwordResetToken.create({
      data: {
        userId: u.id, tokenHash: 'h'.repeat(64),
        expiresAt: new Date(Date.now() + 86_400_000),
        usedAt: daysAgo(2), createdAt: daysAgo(3),
      },
    });
    await (await import('../../src/workers/jobs/purge-password-reset-tokens.job.js')).runPurgePasswordResetTokens();
    expect(await prisma.passwordResetToken.findUnique({ where: { id: t.id } })).toBeNull();
  });
});

describe('reset-stale-on-duty job', () => {
  it('resets driver on_duty=true with no active trip and stale update', async () => {
    const { createDriver } = await import('../helpers/factories.js');
    const d = await createDriver({ kycStatus: 'VERIFIED' });
    const driverId = d.driverProfile!.id;
    // Trigger trg_driver_profiles_updated forces updated_at=now() on UPDATE.
    // Must disable + update inside a single $transaction — Prisma pool routes
    // consecutive raw queries to different connections otherwise.
    await prisma.$transaction(async (tx) => {
      // DISABLE TRIGGER USER — disables all user triggers on the table
      // (no specific name lookup, survives schema rename drift).
      await tx.$executeRawUnsafe(`ALTER TABLE driver_profiles DISABLE TRIGGER USER`);
      try {
        await tx.$executeRaw`UPDATE driver_profiles SET on_duty = true, updated_at = now() - interval '1 day' WHERE id = ${driverId}::uuid`;
      } finally {
        await tx.$executeRawUnsafe(`ALTER TABLE driver_profiles ENABLE TRIGGER USER`);
      }
    });

    // Diagnostic: assert manipulation took effect before job runs.
    const mid = await prisma.driverProfile.findUnique({ where: { id: driverId } });
    expect(mid?.onDuty).toBe(true);
    expect(mid!.updatedAt.getTime()).toBeLessThan(Date.now() - 6 * 3_600_000);

    await (await import('../../src/workers/jobs/reset-stale-on-duty.job.js')).runResetStaleOnDuty();
    const after = await prisma.driverProfile.findUnique({ where: { id: driverId } });
    expect(after?.onDuty).toBe(false);
  });

  it('keeps driver on_duty=true with recent update', async () => {
    const { createDriver } = await import('../helpers/factories.js');
    const d = await createDriver({ kycStatus: 'VERIFIED' });
    const driverId = d.driverProfile!.id;
    await prisma.driverProfile.update({ where: { id: driverId }, data: { onDuty: true } });
    await (await import('../../src/workers/jobs/reset-stale-on-duty.job.js')).runResetStaleOnDuty();
    const after = await prisma.driverProfile.findUnique({ where: { id: driverId } });
    expect(after?.onDuty).toBe(true);
  });
});

describe('ensure-sequences job', () => {
  it('returns created array (idempotent when sequences already exist)', async () => {
    const r = await (await import('../../src/workers/jobs/ensure-sequences.job.js')).runEnsureSequences();
    expect(Array.isArray(r.created)).toBe(true);
  });

  it('ensures next-year booking + next-FY invoice sequences exist', async () => {
    const year = new Date().getUTCFullYear();
    const bookingSeq = `booking_reference_seq_${year + 1}`;
    const invoiceSeq = `invoice_number_seq_${year + 1}_${String((year + 2) % 100).padStart(2, '0')}`;
    const rows = await prisma.$queryRawUnsafe<Array<{ relname: string }>>(
      `SELECT relname FROM pg_class WHERE relkind='S' AND relname IN ($1, $2)`, bookingSeq, invoiceSeq,
    );
    expect(rows.length).toBeGreaterThan(0);
  });
});
describe('purge-seat-locks job', () => {
  it('deletes seat locks past their expiry', async () => {
    const { seedBookingScenario } = await import('../helpers/network-factories.js');
    const seed = await seedBookingScenario({ bookingCount: 0 });
    const u = await createPassenger();
    const lock = await prisma.seatLock.create({
      data: {
        scheduleId: seed.schedule.id, seatId: seed.seats[0]!.id, userId: u.id,
        expiresAt: hoursAgo(1),
      },
    });
    await (await import('../../src/workers/jobs/purge-seat-locks.job.js')).runPurgeSeatLocks();
    expect(await prisma.seatLock.findUnique({ where: { id: lock.id } })).toBeNull();
  });
});

describe('purge-gateway-webhooks job', () => {
  it('deletes gateway webhooks older than 90 days', async () => {
    const { seedBookingScenario } = await import('../helpers/network-factories.js');
    const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 1, status: 'CONFIRMED' });
    const payment = await prisma.payment.findFirst({ where: { booking: { userId: seed.bookings[0]!.userId } } });
    if (!payment) throw new Error('payment not seeded');
    const wh = await prisma.gatewayWebhook.create({
      data: {
        paymentId: payment.id, eventType: 'payment.captured',
        payloadHash: newUuid().replace(/-/g, '') + newUuid().replace(/-/g, ''),
        payloadJson: { _v: 1 }, signature: 'sig', receivedAt: daysAgo(100),
      },
    });
    await (await import('../../src/workers/jobs/purge-gateway-webhooks.job.js')).runPurgeGatewayWebhooks();
    expect(await prisma.gatewayWebhook.findUnique({ where: { id: wh.id } })).toBeNull();
  });
});

describe('purge-idempotency-keys job', () => {
  it('nulls idempotency_key on old FAILED payments', async () => {
    const { seedBookingScenario } = await import('../helpers/network-factories.js');
    const seed = await seedBookingScenario({ bookingCount: 1, passengersPerBooking: 1, status: 'CONFIRMED' });
    const orig = await prisma.payment.findFirst({ where: { booking: { userId: seed.bookings[0]!.userId } } });
    if (!orig) throw new Error('payment not seeded');
    const oldFailed = await prisma.payment.create({
      data: {
        bookingId: orig.bookingId, idempotencyKey: 'test-key-' + newUuid(),
        gateway: 'RAZORPAY', amountPaise: 45000n, status: 'FAILED',
        createdAt: daysAgo(2),
      },
    });
    await (await import('../../src/workers/jobs/purge-idempotency-keys.job.js')).runPurgeIdempotencyKeys();
    const after = await prisma.payment.findUnique({ where: { id: oldFailed.id } });
    expect(after?.idempotencyKey).toMatch(/^expired_/);
  });
});

describe('expire-pending-bookings job', () => {
  it('expires bookings PENDING for more than 15 min', async () => {
    const { seedBookingScenario } = await import('../helpers/network-factories.js');
    const seed = await seedBookingScenario({ bookingCount: 0 });
    const u = await createPassenger();
    const booking = await prisma.booking.create({
      data: {
        bookingReference: 'BKG-TEST-' + newUuid().slice(0, 8),
        userId: u.id, scheduleId: seed.schedule.id,
        boardingStandId: seed.stand1.id, droppingStandId: seed.stand2.id,
        totalFareAmount: 45000n,
        fareBreakdownJson: { _v: 1, base_fare_paise: 45000, tax_paise: 0, convenience_fee_paise: 0, total_paise: 45000 },
        status: 'PENDING', createdAt: new Date(Date.now() - 20 * 60_000),
      },
    });
    await (await import('../../src/workers/jobs/expire-pending-bookings.job.js')).runExpirePendingBookings();
    const after = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(after?.status).toBe('EXPIRED');
  });
});