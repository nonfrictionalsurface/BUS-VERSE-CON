import { api } from '@/lib/api/client';
import { ScheduleDetail, Seat, SeatLayout, SeatLockResponse } from '../types';

export async function fetchScheduleDetail(scheduleId: string): Promise<ScheduleDetail> {
  const response = await api.get<ScheduleDetail>(`/public/schedules/${scheduleId}`);
  return response.data;
}

export interface SeatAvailabilityResult {
  seats: Seat[];
  layout: SeatLayout;
}

function parseBackendSeat(raw: any, index: number): Seat {
  const id = raw.id || raw.seatId;
  const label = raw.label || raw.seatLabel || `S${index + 1}`;
  const row = String(raw.row || raw.seatRow || label.charAt(0) || 'A');
  const column = Number(raw.column || raw.seatColumn || label.slice(1) || (index % 4) + 1);

  // Correctly map backend status (which comes as raw.status, not raw.state)
  let status: 'AVAILABLE' | 'LOCKED' | 'BOOKED' | 'BLOCKED' = 'AVAILABLE';
  if (raw.status === 'LOCKED') status = 'LOCKED';
  else if (raw.status === 'BOOKED') status = 'BOOKED';
  else if (raw.status === 'BLOCKED') status = 'BLOCKED';

  return {
    id,
    seatLabel: label,
    seatRow: row,
    seatColumn: column,
    seatType: raw.type || raw.seatType || 'SEATER',
    isFemaleOnly: Boolean(raw.isFemaleOnly),
    status,
    lockedUntil: raw.lockedUntil || null,
  };
}

export async function fetchSeatAvailability(scheduleId: string, capacity: number = 40): Promise<SeatAvailabilityResult> {
  const res = await api.get<any>(`/passenger/schedules/${scheduleId}/availability`);
  const rawList = res.data?.seats || (Array.isArray(res.data) ? res.data : []);

  // If the backend returns no seats, it means the bus layout is missing OR the bus is PENDING.
  // Do NOT generate fake seats. Throw an error so the UI can show a proper message.
  if (!rawList || rawList.length === 0) {
    throw new Error("Seat layout not available. The bus may be pending approval.");
  }

  const seats = rawList.map((s: any, idx: number) => parseBackendSeat(s, idx));
  const backendLayout = res.data?.layout;

  const layout: SeatLayout = {
    rowsCount: backendLayout?.rowsCount || Math.ceil(seats.length / 4),
    columnsCount: backendLayout?.columnsCount || 4,
    aisleCells: backendLayout?.aisleCells || [],
  };

  return { seats, layout };
}

export async function lockSeat(scheduleId: string, seatId: string): Promise<SeatLockResponse> {
  const response = await api.post<SeatLockResponse>('/passenger/seat-locks', {
    scheduleId,
    seatId,
  });
  return response.data;
}

export async function releaseSeatLock(lockId: string): Promise<void> {
  await api.delete(`/passenger/seat-locks/${lockId}`);
}