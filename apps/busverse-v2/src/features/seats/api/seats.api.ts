import { api } from '@/lib/api/client';

export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED' | 'MINE';
export type SeatType = 'SEATER' | 'SLEEPER' | 'SEMI_SLEEPER';

/** Single source of truth for the seat shape used by every component. */
export interface Seat {
  id: string;
  seatLabel: string;
  seatRow: string;
  seatColumn: number;
  seatType: SeatType;
  isFemaleOnly: boolean;
  status: SeatStatus;
  lockedUntil?: string | null;
}

export interface SeatLayout {
  rowsCount: number;
  columnsCount: number;
  aisleCells: Array<{ row: string; column: number }>;
}

export interface SeatLock {
  lockId: string;
  seatId: string;
  seatLabel: string;
  expiresAt: string;
}

export interface AvailabilityResponse {
  seats: Seat[];
  layout: SeatLayout;
}

function toRowLetter(v: unknown): string {
  if (typeof v === 'number') return String.fromCharCode(64 + v);
  return String(v ?? '');
}

function mapSeat(raw: any): Seat {
  return {
    id: String(raw.id ?? ''),
    seatLabel: String(raw.label ?? raw.seatLabel ?? ''),
    seatRow: toRowLetter(raw.row ?? raw.seatRow ?? ''),
    seatColumn: Number(raw.column ?? raw.seatColumn ?? 0),
    seatType: (raw.type ?? raw.seatType ?? 'SEATER') as SeatType,
    isFemaleOnly: !!raw.isFemaleOnly,
    // ⭐ The API sends `state`; we normalize to `status` — all consumers read `.status`
    status: (raw.state ?? raw.status ?? 'AVAILABLE') as SeatStatus,
    lockedUntil: raw.lockedUntil ?? null,
  };
}

export const seatsApi = {
  async getAvailability(scheduleId: string): Promise<AvailabilityResponse> {
    const raw = await api.get<any>(`/passenger/schedules/${scheduleId}/availability`);
    const layoutRaw = raw?.layout ?? raw ?? {};
    const seatsRaw: any[] = raw?.seats ?? [];
    const seats = seatsRaw.map(mapSeat);

    const aisleCells = (layoutRaw?.aisleCells ?? []).map((c: any) => ({
      row: toRowLetter(c?.row ?? ''),
      column: Number(c?.column ?? 0),
    }));

    return {
      seats,
      layout: {
        rowsCount: Number(layoutRaw?.rowsCount ?? 0),
        columnsCount: Number(layoutRaw?.columnsCount ?? 0),
        aisleCells,
      },
    };
  },

  async lock(scheduleId: string, seatId: string): Promise<SeatLock> {
    const raw = await api.post<any>('/passenger/seat-locks', { scheduleId, seatId });
    return {
      lockId: String(raw.lockId ?? ''),
      seatId,
      seatLabel: String(raw.seatLabel ?? ''),
      expiresAt: String(raw.expiresAt ?? ''),
    };
  },

  async release(lockId: string): Promise<void> {
    await api.delete(`/passenger/seat-locks/${lockId}`);
  },
};