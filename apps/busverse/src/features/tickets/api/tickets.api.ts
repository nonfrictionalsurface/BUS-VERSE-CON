import { api } from '@/lib/api/client';
import { TicketData, RefundPreviewData, LiveTripSnapshot } from '../types';
import { BookingResponse } from '@/features/booking/types';

export async function fetchBookingTicket(bookingId: string): Promise<TicketData> {
  const response = await api.get<TicketData>(`/passenger/bookings/${bookingId}/ticket`);
  return response.data;
}

export async function fetchRefundPreview(bookingId: string): Promise<RefundPreviewData> {
  const response = await api.get<RefundPreviewData>(`/passenger/bookings/${bookingId}/refund-preview`);
  return response.data;
}

export async function executeCancelBooking(bookingId: string): Promise<{
  status: string;
  refund: {
    refundId: string;
    tier: string;
    amountPaise: number;
    status: string;
  };
}> {
  const response = await api.post<any>(`/passenger/bookings/${bookingId}/cancel`, {});
  return response.data;
}

export async function fetchPassengerBookings(limit = 20, cursor?: string | null): Promise<{
  data: BookingResponse[];
  nextCursor?: string | null;
}> {
  const url = `/passenger/bookings?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
  const response = await api.get<BookingResponse[]>(url);
  return {
    data: response.data || [],
    nextCursor: response.meta?.nextCursor,
  };
}

export async function fetchLiveTripSnapshot(tripId: string): Promise<LiveTripSnapshot> {
  const response = await api.get<LiveTripSnapshot>(`/passenger/trips/${tripId}/live`);
  return response.data;
}