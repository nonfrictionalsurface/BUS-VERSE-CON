import { api } from '@/lib/api/client';

export interface TicketPayload {
  ticketId: string;
  bookingId: string;
  qrPayload: string;
  status: string;
  issuedAt: string;
}

export const ticketsApi = {
  getTicket: async (bookingId: string): Promise<TicketPayload> => {
    const res = await api.get<TicketPayload>(`/passenger/bookings/${bookingId}/ticket`);
    return res.data;
  },

  getRefundPreview: async (bookingId: string) => {
    const res = await api.get<any>(`/passenger/bookings/${bookingId}/refund-preview`);
    return res.data;
  },

  cancelBooking: async (bookingId: string) => {
    const res = await api.post<any>(`/passenger/bookings/${bookingId}/cancel`);
    return res.data;
  },
};
