import { api } from '../../../lib/api/client';
import { Seat, SeatLayout, SeatLock, AvailabilityResponse, SeatType, SeatStatus } from '../types';

function toRowLetter(v: unknown): string {
  if (typeof v === 'number') return String.fromCharCode(64 + v);
  return String(v ?? '');
}

function mapSeat(raw: any): Seat {
  return {
    id: String(raw.id ?? raw.seatId ?? ''),
    seatLabel: String(raw.label ?? raw.seatLabel ?? ''),
    seatRow: toRowLetter(raw.row ?? raw.seatRow ?? ''),
    seatColumn: Number(raw.column ?? raw.seatColumn ?? 0),
    seatType: (raw.type ?? raw.seatType ?? 'SEATER') as SeatType,
    isFemaleOnly: !!raw.isFemaleOnly,
    status: (raw.state ?? raw.status ?? 'AVAILABLE') as SeatStatus,
    lockedUntil: raw.lockedUntil ?? null,
  };
}

function unwrap<T = any>(raw: any): T {
  if (raw?.data !== undefined) return raw.data as T;
  return raw as T;
}

export async function fetchAvailability(scheduleId: string): Promise<AvailabilityResponse> {
  const raw = unwrap(await api.get(`/passenger/schedules/${scheduleId}/availability`));
  const layoutRaw = raw?.layout ?? raw ?? {};
  const seatsRaw: any[] = raw?.seats ?? raw?.seatMap?.seats ?? [];
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
}

export async function lockSeat(scheduleId: string, seatId: string): Promise<SeatLock> {
  const raw = unwrap(await api.post('/passenger/seat-locks', { scheduleId, seatId }));
  return {
    lockId: String(raw.lockId ?? ''),
    seatId,
    seatLabel: String(raw.seatLabel ?? ''),
    expiresAt: String(raw.expiresAt ?? ''),
  };
}

export async function releaseLock(lockId: string): Promise<void> {
  await api.delete(`/passenger/seat-locks/${lockId}`);
}