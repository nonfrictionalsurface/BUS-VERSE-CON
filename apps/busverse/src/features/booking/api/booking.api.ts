import { api } from '@/lib/api/client';

export interface CreateBookingPassengerInput {
  seatId: string;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
}

export interface CreateBookingResponse {
  bookingId: string;
  status: 'PENDING';
  expiresAt: string;
  totalFarePaise: number;
}

export const bookingApi = {
  createBooking: async (input: {
    scheduleId: string;
    lockId: string;
    boardingStandId: string;
    droppingStandId: string;
    passengers: CreateBookingPassengerInput[];
  }): Promise<CreateBookingResponse> => {
    const res = await api.post<CreateBookingResponse>('/passenger/bookings', input);
    return res.data;
  },

  getBooking: async (bookingId: string) => {
    const res = await api.get<any>(`/passenger/bookings/${bookingId}`);
    return res.data;
  },

  getBookingsList: async (cursor?: string) => {
    const res = await api.get<any[]>(`/passenger/bookings?limit=20${cursor ? `&cursor=${cursor}` : ''}`);
    return res;
  },
};
