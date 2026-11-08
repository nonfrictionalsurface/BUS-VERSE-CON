import { api } from '@/lib/api/client';
import type { ScheduleDetail, Seat, SeatLayout, SeatLockResponse } from '../types';

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

// ---------------------------------------------------------------------------
// Named helpers used by the schedule and booking pages.
// ---------------------------------------------------------------------------

/** GET /public/schedules/:id - route, stands, bus, fare. No sign-in needed. */
export async function fetchScheduleDetail(scheduleId: string): Promise<ScheduleDetail> {
  const res = await api.get<ScheduleDetail>(`/public/schedules/${scheduleId}`);
  return res.data;
}

/** Shape of GET /passenger/schedules/:id/availability (Seat Layout v2 API). */
interface AvailabilityResponse {
  layout: {
    rowsCount: number;
    columnsCount: number;
    aisleCells: Array<{ row: number | string; column: number }>;
  };
  seats: Array<{
    id: string;
    label: string;
    row: string;
    column: number;
    type: 'SEATER' | 'SEMI_SLEEPER' | 'SLEEPER';
    isFemaleOnly: boolean;
    state: 'AVAILABLE' | 'LOCKED' | 'MINE' | 'BOOKED';
    lockedUntil: string | null;
  }>;
}

const rowLetter = (row: number): string => String.fromCharCode(64 + row); // 1 -> A

/**
 * Availability in the shape the web seat deck draws. This view is the legacy one (single grid of
 * rows A.. and columns 1..): double-deckers show their decks stacked. The full v2 layout is in
 * `layout.spec` of the same response for when the deck is moved onto the seat engine.
 */
export async function fetchSeatAvailability(
  scheduleId: string,
  _capacity?: number,
): Promise<{ seats: Seat[]; layout: SeatLayout }> {
  const res = await api.get<AvailabilityResponse>(`/passenger/schedules/${scheduleId}/availability`);
  const d = res.data;
  const seats: Seat[] = d.seats.map((s) => ({
    id: s.id,
    seatLabel: s.label,
    seatRow: s.row,
    seatColumn: s.column,
    seatType: s.type === 'SLEEPER' ? 'SLEEPER' : 'SEATER',
    isFemaleOnly: s.isFemaleOnly,
    // a seat held by this user is shown through the page's own lock list, not as taken
    status: s.state === 'MINE' ? 'AVAILABLE' : s.state,
    lockedUntil: s.lockedUntil,
  }));
  const layout: SeatLayout = {
    rowsCount: d.layout.rowsCount,
    columnsCount: d.layout.columnsCount,
    aisleCells: d.layout.aisleCells.map((c) => ({
      row: typeof c.row === 'number' ? rowLetter(c.row) : c.row,
      column: c.column,
    })),
  };
  return { seats, layout };
}

export async function lockSeat(scheduleId: string, seatId: string): Promise<SeatLockResponse> {
  return seatsApi.lockSeat(scheduleId, seatId);
}

export async function releaseSeatLock(lockId: string): Promise<void> {
  await seatsApi.releaseSeatLock(lockId);
}
