import { useCallback, useEffect, useMemo, useState } from 'react';
import { Seat, SeatLayout, SeatLock } from '../types';
import { fetchAvailability, lockSeat, releaseLock } from '../api/seats.api';

export function useSeatDeck(scheduleId: string | undefined, enabled = true) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [layout, setLayout] = useState<SeatLayout | null>(null);
  const [locks, setLocks] = useState<Map<string, SeatLock>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingSeatId, setTogglingSeatId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!scheduleId) return;
    try {
      const data = await fetchAvailability(scheduleId);
      setSeats(data.seats);
      setLayout(data.layout);
      setError(null);
    } catch (e: any) {
      console.warn('[useSeatDeck] availability failed:', e?.message);
      setError(e?.message ?? 'Could not load seats');
    }
  }, [scheduleId]);

  useEffect(() => {
    if (!scheduleId || !enabled) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [scheduleId, enabled, refresh]);

  const selectedSeatIds = useMemo(() => Array.from(locks.keys()), [locks]);

  const earliestExpiry = useMemo(() => {
    let earliest: string | null = null;
    locks.forEach((l) => {
      if (!earliest || new Date(l.expiresAt) < new Date(earliest!)) earliest = l.expiresAt;
    });
    return earliest;
  }, [locks]);

  const toggle = useCallback(
    async (seat: Seat) => {
      if (!scheduleId || togglingSeatId) return;
      setTogglingSeatId(seat.id);
      try {
        if (locks.has(seat.id)) {
          const lock = locks.get(seat.id)!;
          try { await releaseLock(lock.lockId); } catch {}
          setLocks((prev) => {
            const next = new Map(prev);
            next.delete(seat.id);
            return next;
          });
        } else {
          const lock = await lockSeat(scheduleId, seat.id);
          setLocks((prev) => new Map(prev).set(seat.id, { ...lock, seatLabel: seat.seatLabel }));
        }
      } catch (e: any) {
        const code = e?.code as string | undefined;
        if (code === 'SEAT_LOCKED' || code === 'SEAT_ALREADY_BOOKED') {
          setError('That seat was just taken. Pick another.');
          await refresh();
        } else {
          setError(e?.message ?? 'Could not lock seat');
        }
      } finally {
        setTogglingSeatId(null);
      }
    },
    [scheduleId, locks, togglingSeatId, refresh],
  );

  const handleExpire = useCallback(() => {
    setLocks(new Map());
    setError('Your seat lock expired. Please pick again.');
    refresh();
  }, [refresh]);

  return {
    seats, layout, locks, loading, error, togglingSeatId,
    selectedSeatIds, earliestExpiry,
    toggle, handleExpire, refresh,
    clearError: () => setError(null),
  };
}