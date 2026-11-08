import { api, EP } from '../../../lib/api';
import type { AvailabilityDTO, SeatLockDTO } from '../../../types';

export async function getAvailability(scheduleId: string): Promise<AvailabilityDTO> {
  return api.get<AvailabilityDTO>(EP.availability(scheduleId));
}

export async function lockSeat(scheduleId: string, seatId: string): Promise<SeatLockDTO> {
  return api.post<SeatLockDTO>(EP.seatLockCreate, { scheduleId, seatId });
}

export async function releaseLock(lockId: string): Promise<void> {
  return api.del<void>(EP.seatLockRelease(lockId));
}

export async function getActiveLocks(): Promise<SeatLockDTO[]> {
  return api.get<SeatLockDTO[]>(EP.seatLocksActive);
}