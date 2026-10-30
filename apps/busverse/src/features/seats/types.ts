/**
 * Seat Matrix & Availability Types
 * Contract Reference: 07-API-AND-REALTIME-CONTRACTS.md Section 4.3 & 4.4
 */

export type SeatState = 'AVAILABLE' | 'SELECTED' | 'LOCKED' | 'BOOKED' | 'FEMALE_ONLY';
export type SeatClass = 'SEATER' | 'SLEEPER';

export interface Seat {
  id: string;
  seatLabel: string;
  seatRow: string | number;
  seatColumn: number;
  seatType: SeatClass;
  isFemaleOnly: boolean;
  status: 'AVAILABLE' | 'LOCKED' | 'BOOKED' | 'BLOCKED';
  lockedUntil?: string | null;
}

export interface SeatLayout {
  rowsCount: number;
  columnsCount: number;
  aisleCells: Array<{ row: string | number; column: number }>;
}

export interface ScheduleDetail {
  scheduleId: string;
  status: string;
  busType: string;
  operatorName: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  fare: { amountPaise: number; currency: string } | number;
  availableSeats: number;
  bus: {
    id: string;
    registrationNumber: string;
    model: string;
    capacity: number;
    busType: string;
    amenities: string[];
  };
  route: {
    id: string;
    originCity: { id: string; name: string; state: string };
    destinationCity: { id: string; name: string; state: string };
    stands: Array<{
      stand: { id: string; cityId: string; name: string; type: string };
      sequence: number;
    }>;
  };
}

export interface SeatLockResponse {
  lockId: string;
  expiresAt: string;
  remainingSeconds: number;
}

export interface ActiveLock {
  lockId: string;
  seatId: string;
  seatLabel: string;
  scheduleId: string;
  expiresAt: string;
}