import { prisma } from '../../src/lib/prisma.js';
import { redis } from '../../src/lib/redis.js';

/**
 * Full reset of every business table in FK dependency order.
 * Phase 3's network tests and Phase 4's booking tests both rely on this clearing
 * everything — a partial reset leaves rows that violate unique indexes (e.g. duplicate
 * operators.gstin) and FK constraints on the next run.
 */
export async function resetIdentityTables(): Promise<void> {
  await prisma.$transaction([
    // Booking + payments + trip children first (deepest FKs)
    prisma.refund.deleteMany({}),
    prisma.gatewayWebhook.deleteMany({}),
    prisma.boardingScan.deleteMany({}),
    prisma.ticket.deleteMany({}),
    prisma.gstInvoice.deleteMany({}),
    prisma.payment.deleteMany({}),
    prisma.bookingPassenger.deleteMany({}),
    prisma.booking.deleteMany({}),
    prisma.seatLock.deleteMany({}),
    // Trip + GPS
    prisma.gpsSample.deleteMany({}),
    prisma.trip.deleteMany({}),
    // Network children
    prisma.schedule.deleteMany({}),
    prisma.routeStand.deleteMany({}),
    prisma.seat.deleteMany({}),
    prisma.seatLayout.deleteMany({}),
    prisma.bus.deleteMany({}),
    prisma.route.deleteMany({}),
    prisma.stand.deleteMany({}),
    prisma.city.deleteMany({}),
    // Operator (before users — operator_users FK to both)
    prisma.driverProfile.deleteMany({}),
    prisma.operatorUser.deleteMany({}),
    prisma.operator.deleteMany({}),
    // Identity leaves
    prisma.consentRecord.deleteMany({}),
    prisma.passwordResetToken.deleteMany({}),
    prisma.refreshTokenChain.deleteMany({}),
    prisma.session.deleteMany({}),
    prisma.otpChallenge.deleteMany({}),
    prisma.adminUser.deleteMany({}),
    prisma.passengerProfile.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);

  const keysToDelete: string[] = [];
  let cursor = '0';
  do {
    const [next, batch] = await redis.scan(cursor, 'MATCH', 'rl:*', 'COUNT', 200);
    cursor = next;
    keysToDelete.push(...batch);
  } while (cursor !== '0');
  if (keysToDelete.length > 0) await redis.del(...keysToDelete);
}