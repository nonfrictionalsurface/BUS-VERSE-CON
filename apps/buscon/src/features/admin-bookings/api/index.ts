import { api } from '@/lib/api/client';

export interface AdminBooking {
  bookingId: string;
  bookingReference: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  operatorId: string;
  operatorName: string;
  scheduleId: string;
  departureTime: string;
  routeSummary: { originCity: string; destinationCity: string };
  passengerCount: number;
  passengers: Array<{ name: string; seatLabel: string; age: number; gender: string }>;
  totalFarePaise: number;
  confirmedAt: string | null;
  createdAt: string;
}

export const adminBookingsApi = {
  list: async (): Promise<AdminBooking[]> => {
    const res = await api.get<AdminBooking[]>('/admin/bookings?limit=50');
    return res.data;
  },
  unmask: async (id: string, reason: string): Promise<AdminBooking> => {
    const res = await api.get<AdminBooking>(`/admin/bookings/${id}?includePii=true&reason=${encodeURIComponent(reason)}`);
    return res.data;
  }
};