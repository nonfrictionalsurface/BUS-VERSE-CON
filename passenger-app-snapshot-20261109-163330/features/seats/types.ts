export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED' | 'MINE';
export type SeatType = 'SEATER' | 'SLEEPER' | 'SEMI_SLEEPER';

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