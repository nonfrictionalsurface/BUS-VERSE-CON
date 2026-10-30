import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { expirePendingBooking } from '../../modules/booking/booking.service.js';

const WINDOW_MIN = 15;
const BATCH = 100;

export async function runExpirePendingBookings(): Promise<{ scanned: number; expired: number }> {
  const cutoff = new Date(Date.now() - WINDOW_MIN * 60_000);
  const candidates = await prisma.booking.findMany({
    where: { status: 'PENDING', deletedAt: null, createdAt: { lt: cutoff } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: BATCH,
  });
  let expired = 0;
  for (const row of candidates) {
    try {
      if (await expirePendingBooking(row.id)) expired++;
    } catch (err) {
      logger.warn({ err, bookingId: row.id }, 'expire-pending-bookings: per-booking failure');
    }
  }
  if (candidates.length > 0) {
    logger.info({ scanned: candidates.length, expired }, 'expire-pending-bookings: complete');
  }
  return { scanned: candidates.length, expired };
}