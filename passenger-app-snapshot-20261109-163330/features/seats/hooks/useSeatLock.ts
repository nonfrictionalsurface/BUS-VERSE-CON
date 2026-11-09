import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_SEATS_PER_BOOKING } from '@busverse/seat-engine';
import { useToast } from '../../../components/ui';
import { ApiError } from '../../../lib/api';
import { wsManager } from '../../../lib/ws';
import type { SeatLockDTO, SeatReleasedEvent } from '../../../types';
import { getActiveLocks, lockSeat as apiLockSeat, releaseLock as apiReleaseLock } from '../api/seats.api';

type LocksMap = Record<string, SeatLockDTO>;

export interface UseSeatLockResult {
  /** My locks, by seatId. */
  locks: LocksMap;
  pending: ReadonlySet<string>;
  earliestExpiry: number | null;
  /** Holds from an earlier visit. Shown to the user, never restored silently. */
  resumable: SeatLockDTO[];
  toggleSeat: (seatId: string) => Promise<void>;
  /** All-or-nothing: if one seat cannot be locked, the ones just locked are released again. */
  lockMany: (seatIds: string[]) => Promise<boolean>;
  releaseSeat: (seatId: string) => Promise<void>;
  releaseAll: () => Promise<void>;
  resume: () => void;
  discardResumable: () => Promise<void>;
  dropExpired: () => void;
}

const messageFor = (err: unknown): string => {
  if (err instanceof ApiError && (err.code === 'SEAT_LOCKED' || err.code === 'SEAT_ALREADY_BOOKED')) return err.message;
  return 'Could not hold that seat. Please try again.';
};

export function useSeatLock(scheduleId: string, maxSeats: number = MAX_SEATS_PER_BOOKING): UseSeatLockResult {
  const toast = useToast();
  const [locks, setLocks] = useState<LocksMap>({});
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [resumable, setResumable] = useState<SeatLockDTO[]>([]);
  const locksRef = useRef<LocksMap>({});
  locksRef.current = locks;

  const mark = useCallback((ids: string[], on: boolean) => {
    setPending((prev) => {
      const next = new Set(prev);
      for (const id of ids) (on ? next.add(id) : next.delete(id));
      return next;
    });
  }, []);

  const acquire = useCallback(
    async (seatId: string): Promise<SeatLockDTO | null> => {
      mark([seatId], true);
      try {
        const lock = await apiLockSeat(scheduleId, seatId);
        setLocks((prev) => ({ ...prev, [seatId]: lock }));
        return lock;
      } catch (err) {
        toast.show(messageFor(err), 'error');
        return null;
      } finally {
        mark([seatId], false);
      }
    },
    [scheduleId, toast, mark],
  );

  const releaseSeat = useCallback(
    async (seatId: string) => {
      const lock = locksRef.current[seatId];
      if (!lock) return;
      setLocks((prev) => {
        const next = { ...prev };
        delete next[seatId];
        return next;
      });
      try {
        await apiReleaseLock(lock.lockId);
      } catch {
        setLocks((prev) => ({ ...prev, [seatId]: lock }));
        toast.show('Could not release the seat. Please try again.', 'error');
      }
    },
    [toast],
  );

  const toggleSeat = useCallback(
    async (seatId: string) => {
      if (locksRef.current[seatId]) return releaseSeat(seatId);
      if (Object.keys(locksRef.current).length >= maxSeats) {
        toast.show(`You can book at most ${maxSeats} seats at a time.`, 'warning');
        return;
      }
      await acquire(seatId);
    },
    [acquire, releaseSeat, maxSeats, toast],
  );

  const lockMany = useCallback(
    async (seatIds: string[]): Promise<boolean> => {
      if (Object.keys(locksRef.current).length + seatIds.length > maxSeats) {
        toast.show(`You can book at most ${maxSeats} seats at a time.`, 'warning');
        return false;
      }
      const got: SeatLockDTO[] = [];
      for (const id of seatIds) {
        const lock = await acquire(id);
        if (!lock) {
          for (const g of got) await releaseSeat(g.seatId);
          return false;
        }
        got.push(lock);
      }
      return true;
    },
    [acquire, releaseSeat, maxSeats, toast],
  );

  const releaseAll = useCallback(async () => {
    const entries = Object.values(locksRef.current);
    if (entries.length === 0) return;
    setLocks({});
    await Promise.allSettled(entries.map((l) => apiReleaseLock(l.lockId)));
  }, []);

  const resume = useCallback(() => {
    setLocks((prev) => {
      const next = { ...prev };
      for (const l of resumable) next[l.seatId] = l;
      return next;
    });
    setResumable([]);
  }, [resumable]);

  const discardResumable = useCallback(async () => {
    const list = resumable;
    setResumable([]);
    await Promise.allSettled(list.map((l) => apiReleaseLock(l.lockId)));
  }, [resumable]);

  const dropExpired = useCallback(() => {
    const now = Date.now();
    setLocks((prev) => {
      const next: LocksMap = {};
      for (const [id, l] of Object.entries(prev)) if (new Date(l.expiresAt).getTime() > now) next[id] = l;
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, []);

  // Someone else (or the server) released one of my seats.
  useEffect(() => {
    return wsManager.on('seat:released', (data) => {
      const evt = data as unknown as SeatReleasedEvent;
      if (!locksRef.current[evt.seatId]) return;
      setLocks((prev) => {
        const next = { ...prev };
        delete next[evt.seatId];
        return next;
      });
      toast.show('One of your seat holds ended. Please pick again.', 'warning', 4000);
    });
  }, [toast]);

  // Offer, never silently restore, holds left over from an earlier visit.
  useEffect(() => {
    let cancelled = false;
    getActiveLocks()
      .then((active) => {
        if (!cancelled) setResumable(active.filter((l) => l.scheduleId === scheduleId && !locksRef.current[l.seatId]));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [scheduleId]);

  const earliestExpiry = useMemo(() => {
    const times = Object.values(locks)
      .map((l) => new Date(l.expiresAt).getTime())
      .filter((t) => Number.isFinite(t));
    return times.length > 0 ? Math.min(...times) : null;
  }, [locks]);

  return { locks, pending, earliestExpiry, resumable, toggleSeat, lockMany, releaseSeat, releaseAll, resume, discardResumable, dropExpired };
}
