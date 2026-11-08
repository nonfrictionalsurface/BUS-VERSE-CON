import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsManager } from '../../../lib/ws';
import type {
  AvailabilityDTO,
  SeatBookedEvent,
  SeatLockedEvent,
  SeatReleasedEvent,
} from '../../../types';

export function useSeatRealtime(scheduleId: string): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!scheduleId) return;
    const topic = `seat:availability:${scheduleId}`;
    wsManager.subscribe(topic);

    const patch = (
      seatId: string,
      state: 'AVAILABLE' | 'LOCKED' | 'BOOKED',
      lockedUntil: string | null,
    ) => {
      qc.setQueryData<AvailabilityDTO>(['availability', scheduleId], (prev) => {
        if (!prev) return prev;
        const idx = prev.seats.findIndex((s) => s.id === seatId);
        if (idx === -1) return prev;
        const nextSeats = [...prev.seats];
        nextSeats[idx] = { ...nextSeats[idx], state, lockedUntil };
        return { ...prev, seats: nextSeats };
      });
    };

    const offLocked = wsManager.on('seat:locked', (data) => {
      const evt = data as unknown as SeatLockedEvent;
      if (evt.lockedByMe) return;
      patch(evt.seatId, 'LOCKED', evt.lockedUntil);
    });
    const offReleased = wsManager.on('seat:released', (data) => {
      const evt = data as unknown as SeatReleasedEvent;
      patch(evt.seatId, 'AVAILABLE', null);
    });
    const offBooked = wsManager.on('seat:booked', (data) => {
      const evt = data as unknown as SeatBookedEvent;
      patch(evt.seatId, 'BOOKED', null);
    });

    return () => {
      wsManager.unsubscribe(topic);
      offLocked();
      offReleased();
      offBooked();
    };
  }, [scheduleId, qc]);
}
