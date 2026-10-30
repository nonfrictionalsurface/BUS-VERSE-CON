import { api } from '@/lib/api/client';

export interface Passenger {
  name: string;
  seatLabel: string;
  age: number;
  gender: string;
}

export interface Booking {
  bookingId: string;
  bookingReference: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  scheduleId: string;
  departureTime: string;
  routeSummary: { originCity: string; destinationCity: string };
  passengerCount: number;
  passengers: Passenger[];
  totalFarePaise: number;
  confirmedAt: string | null;
  createdAt: string;
}

export const bookingsApi = {
  list: async (): Promise<Booking[]> => {
    const res = await api.get<Booking[]>('/operator/bookings?limit=50');
    return res.data;
  }
};