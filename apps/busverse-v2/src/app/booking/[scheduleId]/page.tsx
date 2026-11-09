'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { seatsApi, Seat, SeatLayout, SeatLock } from '@/features/seats/api/seats.api';
import { bookingsApi } from '@/lib/api/bookings.api';
import { SeatDeck } from '@/components/seats/SeatDeck';
import { SeatLegend } from '@/components/seats/SeatLegend';
import { LockCountdown } from '@/components/seats/LockCountdown';
import { Button } from '@/components/ui/Button';
import { formatINR, formatISTTime } from '@/lib/utils/formatters';

export default function SeatDeckPage() {
  const router = useRouter();
  const params = useParams<{ scheduleId: string }>();
  const scheduleId = params?.scheduleId;
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [seats, setSeats] = useState<Seat[]>([]);
  const [layout, setLayout] = useState<SeatLayout | null>(null);
  const [locks, setLocks] = useState<Map<string, SeatLock>>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingSeatId, setTogglingSeatId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/booking/${scheduleId}`)}`);
    }
  }, [authLoading, isAuthenticated, scheduleId, router]);

  // Schedule detail (route, times, fare)
  const { data: schedule } = useQuery({
    queryKey: ['schedule-detail', scheduleId],
    queryFn: () => bookingsApi.getScheduleDetail(scheduleId!),
    enabled: !!scheduleId && isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const refreshAvailability = useCallback(async () => {
    if (!scheduleId) return;
    try {
      const data = await seatsApi.getAvailability(scheduleId);
      setSeats(data.seats);
      setLayout(data.layout);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Could not load seats.');
    }
  }, [scheduleId]);

  useEffect(() => {
    if (!scheduleId || !isAuthenticated) return;
    setLoading(true);
    refreshAvailability().finally(() => setLoading(false));
  }, [scheduleId, isAuthenticated, refreshAvailability]);

  const selectedSeatIds = useMemo(() => Array.from(locks.keys()), [locks]);

  const earliestExpiry = useMemo(() => {
    let earliest: string | null = null;
    locks.forEach((l) => {
      if (!earliest || new Date(l.expiresAt) < new Date(earliest!)) earliest = l.expiresAt;
    });
    return earliest;
  }, [locks]);

  const handleToggle = useCallback(
    async (seat: Seat) => {
      if (!scheduleId || togglingSeatId) return;
      setTogglingSeatId(seat.id);

      try {
        if (locks.has(seat.id)) {
          const lock = locks.get(seat.id)!;
          try { await seatsApi.release(lock.lockId); } catch { /* */ }
          setLocks((prev) => {
            const next = new Map(prev);
            next.delete(seat.id);
            return next;
          });
        } else {
          const lock = await seatsApi.lock(scheduleId, seat.id);
          setLocks((prev) => new Map(prev).set(seat.id, { ...lock, seatLabel: seat.seatLabel }));
        }
      } catch (err: any) {
        const code = err?.code as string | undefined;
        if (code === 'SEAT_LOCKED' || code === 'SEAT_ALREADY_BOOKED') {
          setError('This seat was just taken. Picking another?');
          await refreshAvailability();
        } else {
          setError(err?.message ?? 'Could not lock seat.');
        }
      } finally {
        setTogglingSeatId(null);
      }
    },
    [scheduleId, locks, togglingSeatId, refreshAvailability],
  );

  const handleLockExpire = useCallback(() => {
    setLocks(new Map());
    setError('Your seat lock expired. Please pick again.');
    refreshAvailability();
  }, [refreshAvailability]);

  const handleContinue = () => {
    if (locks.size === 0 || !scheduleId) return;
    const lockList = Array.from(locks.values());
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('busverse_checkout_locks', JSON.stringify(lockList));
    }
    router.push(`/booking/${scheduleId}/passengers`);
  };

  const totalPaise = schedule ? schedule.farePaise * locks.size : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <span className="inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-secondary">Loading seats…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="border-b border-border-hairline bg-surface sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/search" className="text-sm text-text-secondary hover:text-text-primary">
            ← Back
          </Link>
          <p className="text-sm font-semibold text-text-primary">Choose seats</p>
          <div className="w-12" />
        </div>
      </header>

      <main className="flex-1 pb-40">
        <div className="max-w-lg mx-auto px-4 py-5">
          {/* Trip info */}
          {schedule && (
            <div className="mb-5 p-4 bg-surface border border-border-hairline rounded-lg">
              <p className="text-lg font-extrabold text-text-bright leading-tight">
                {schedule.originCityName} → {schedule.destinationCityName}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{schedule.operatorName}</p>
              <div className="flex items-center gap-3 mt-3 text-sm">
                <span className="font-mono font-bold text-text-bright">
                  {formatISTTime(schedule.departureTime)}
                </span>
                <span className="text-text-muted">→</span>
                <span className="font-mono font-bold text-text-bright">
                  {formatISTTime(schedule.arrivalTime)}
                </span>
                <span className="ml-auto text-brand font-bold font-mono">
                  {formatINR(schedule.farePaise)}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-[var(--danger-crimson-subtle)] border border-[var(--danger-crimson)] text-sm text-[var(--danger-crimson)]"
            >
              {error}
            </div>
          )}

          {/* Legend */}
          <div className="mb-4">
            <SeatLegend />
          </div>

          {/* Seat deck */}
          <div className="mt-4 flex justify-center">
            {layout && seats.length > 0 && (
              <SeatDeck
                seats={seats}
                layout={layout}
                selectedSeatIds={selectedSeatIds}
                onSeatClick={handleToggle}
                disabled={!!togglingSeatId}
              />
            )}
            {layout && seats.length === 0 && (
              <p className="text-center text-text-muted py-12">
                No seats available on this bus.
              </p>
            )}
            {!layout && !error && (
              <p className="text-center text-text-muted py-12">
                No seat layout configured for this bus yet.
              </p>
            )}
          </div>
        </div>
      </main>

      {locks.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border-strong shadow-modal z-30">
          <div className="max-w-lg mx-auto px-6 py-4">
            {earliestExpiry && (
              <LockCountdown expiresAt={earliestExpiry} onExpire={handleLockExpire} />
            )}
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider">
                  {locks.size} {locks.size === 1 ? 'seat' : 'seats'}
                </p>
                <p className="text-sm font-bold font-mono text-text-bright">
                  {formatINR(totalPaise)}
                </p>
              </div>
              <Button onClick={handleContinue}>
                Continue ({locks.size})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}