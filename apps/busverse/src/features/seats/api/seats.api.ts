import { api } from '@/lib/api/client';

export interface SeatAvailabilityItem {
  id: string;
  seatRow: string;
  seatColumn: number;
  seatLabel: string;
  seatType: string;
  isFemaleOnly: boolean;
  state: 'AVAILABLE' | 'LOCKED' | 'BOOKED';
}

export interface ScheduleAvailabilityResponse {
  scheduleId: string;
  rowsCount: number;
  columnsCount: number;
  aisleCells: Array<{ row: string; column: number }>;
  seats: SeatAvailabilityItem[];
}

export const seatsApi = {
  getAvailability: async (scheduleId: string): Promise<ScheduleAvailabilityResponse> => {
    const res = await api.get<ScheduleAvailabilityResponse>(`/passenger/schedules/${scheduleId}/availability`);
    return res.data;
  },

  lockSeat: async (scheduleId: string, seatId: string) => {
    const res = await api.post<{ lockId: string; expiresAt: string; remainingSeconds: number }>(
      '/passenger/seat-locks',
      { scheduleId, seatId }
    );
    return res.data;
  },

  releaseSeatLock: async (lockId: string) => {
    await api.delete(`/passenger/seat-locks/${lockId}`);
  },
};
