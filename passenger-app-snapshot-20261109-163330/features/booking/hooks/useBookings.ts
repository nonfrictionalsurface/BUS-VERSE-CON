import { useQuery } from '@tanstack/react-query';
import { getBooking, getRefundPreview, getTicket, listBookings } from '../api/booking.api';

export const bookingKeys = {
  list: ['bookings'] as const,
  detail: (id: string) => ['booking', id] as const,
  ticket: (id: string) => ['ticket', id] as const,
  refund: (id: string) => ['refund-preview', id] as const,
};

export function useBookings(enabled = true) {
  return useQuery({ queryKey: bookingKeys.list, queryFn: () => listBookings(50), enabled, staleTime: 30_000 });
}

/** `refetchInterval` is for screens waiting on a payment to land. */
export function useBooking(id: string, refetchInterval: number | false = false) {
  return useQuery({ queryKey: bookingKeys.detail(id), queryFn: () => getBooking(id), refetchInterval, staleTime: 5_000 });
}

export function useTicket(id: string, enabled: boolean) {
  return useQuery({ queryKey: bookingKeys.ticket(id), queryFn: () => getTicket(id), enabled, staleTime: 60_000 });
}

export function useRefundPreview(id: string) {
  return useQuery({ queryKey: bookingKeys.refund(id), queryFn: () => getRefundPreview(id), staleTime: 0, gcTime: 0 });
}
