import { asyncStore } from './asyncStore';
import type { BookingDetailDTO, TicketDTO } from '../../types';

// Offline ticket cache per 04-TICKET-AND-TRACKING §9.
// QR payload is immutable after issuance (invariant #17), so cache TTL is generous.

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const KEY_TICKET = (bookingId: string) => `@busverse/ticket/${bookingId}`;

type CachedTicket = {
  booking: BookingDetailDTO;
  ticket: TicketDTO;
  cachedAt: number;
};

export async function cacheTicket(booking: BookingDetailDTO, ticket: TicketDTO): Promise<void> {
  const payload: CachedTicket = { booking, ticket, cachedAt: Date.now() };
  await asyncStore.set(KEY_TICKET(booking.bookingId), payload);
}

export async function getCachedTicket(bookingId: string): Promise<CachedTicket | null> {
  const cached = await asyncStore.get<CachedTicket>(KEY_TICKET(bookingId));
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > TTL_MS) {
    await asyncStore.remove(KEY_TICKET(bookingId));
    return null;
  }
  return cached;
}

export async function clearTicketCache(bookingId: string): Promise<void> {
  await asyncStore.remove(KEY_TICKET(bookingId));
}

export async function clearAllTicketCache(): Promise<void> {
  await asyncStore.clear('@busverse/ticket/');
}