'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWsEvent } from '@/lib/ws/useWsEvent';
import { formatINR, formatISTTime, formatDuration } from '@/lib/utils/formatters';
import {
  fetchScheduleDetail,
  fetchSeatAvailability,
  lockSeat,
  releaseSeatLock,
} from '@/features/seats/api/seats.api';
import { ScheduleDetail, Seat, SeatLayout, ActiveLock } from '@/features/seats/types';
import { SeatDeck } from '@/features/seats/components/SeatDeck';
import { SeatLegend } from '@/features/seats/components/SeatLegend';
import { LockCountdown } from '@/features/seats/components/LockCountdown';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { TransitLoader } from '@/components/brand/TransitLoader';
import { ThemeToggle } from '@/lib/theme/ThemeToggle';
import { BusVerseLogo } from '@/components/brand/BusVerseLogo';
import { ArrowLeft, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

const MAX_SEATS_PER_BOOKING = 6;
type LockMap = Map<string, ActiveLock>;

export default function ScheduleDetailPage({ params }: { params: Promise<{ scheduleId: string }> }) {
  const resolvedParams = use(params);
  const scheduleId = resolvedParams.scheduleId;
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [layout, setLayout] = useState<SeatLayout | null>(null);
  const [activeLocks, setActiveLocks] = useState<LockMap>(() => new Map());

  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [pendingSeat, setPendingSeat] = useState<Seat | null>(null);

  const loadData = async (): Promise<Seat[]> => {
    setErrorMsg(null);
    try {
      const sched = await fetchScheduleDetail(scheduleId);
      setSchedule(sched);

      const avail = await fetchSeatAvailability(scheduleId, sched.bus?.capacity || 40);
      setSeats(avail.seats);
      setLayout(avail.layout);
      return avail.seats;
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load schedule data.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [scheduleId]);

  useWsEvent(`seat:availability:${scheduleId}`, 'seat:locked', (data: { seatId: string }) => {
    if (!data?.seatId) return;
    setSeats((prev) =>
      prev.map((s) => (s.id === data.seatId && !activeLocks.has(s.id) ? { ...s, status: 'LOCKED' } : s))
    );
  });

  useWsEvent(`seat:availability:${scheduleId}`, 'seat:released', (data: { seatId: string }) => {
    if (!data?.seatId) return;
    setSeats((prev) =>
      prev.map((s) => (s.id === data.seatId && !activeLocks.has(s.id) ? { ...s, status: 'AVAILABLE' } : s))
    );
  });

  useWsEvent(`seat:availability:${scheduleId}`, 'seat:booked', (data: { seatId: string }) => {
    if (!data?.seatId) return;
    setSeats((prev) =>
      prev.map((s) => (s.id === data.seatId ? { ...s, status: 'BOOKED' } : s))
    );
  });

  const handleSeatClick = async (seat: Seat) => {
    setErrorMsg(null);

    if (activeLocks.has(seat.id)) {
      const existing = activeLocks.get(seat.id)!;
      try {
        await releaseSeatLock(existing.lockId);
      } catch {
        // Ignored
      }
      setActiveLocks((prev) => {
        const next = new Map(prev);
        next.delete(seat.id);
        return next;
      });
      return;
    }

    if (!isAuthenticated) {
      setPendingSeat(seat);
      setIsAuthOpen(true);
      return;
    }

    if (activeLocks.size >= MAX_SEATS_PER_BOOKING) {
      setErrorMsg(`Maximum of ${MAX_SEATS_PER_BOOKING} seats can be selected per booking.`);
      return;
    }

    executeLock(seat);
  };

  const executeLock = async (seat: Seat) => {
    setLocking(true);
    try {
      const lockRes = await lockSeat(scheduleId, seat.id);
      setActiveLocks((prev) => {
        const next = new Map(prev);
        next.set(seat.id, {
          lockId: lockRes.lockId,
          seatId: seat.id,
          seatLabel: seat.seatLabel,
          scheduleId,
          expiresAt: lockRes.expiresAt,
        });
        return next;
      });
    } catch (err: any) {
      if (err.code === 'SEAT_LOCKED') {
        setErrorMsg(`Seat ${seat.seatLabel} was just taken by another passenger.`);
        setSeats((prev) => prev.map((s) => (s.id === seat.id ? { ...s, status: 'LOCKED' } : s)));
      } else {
        setErrorMsg(err.message || 'Could not lock seat. Please pick another.');
      }
    } finally {
      setLocking(false);
    }
  };

  const handleLockExpire = () => {
    setActiveLocks(new Map());
    setErrorMsg('Your 5-minute seat reservation expired. Please pick your seats again.');
    loadData();
  };

  const handleProceedToBooking = () => {
    if (activeLocks.size === 0) return;
    const lockList = Array.from(activeLocks.values());

    const primaryLockId = lockList[0].lockId;
    const seatIdsParam = lockList.map((l) => l.seatId).join(',');
    const labelsParam = lockList.map((l) => l.seatLabel).join(',');

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('busverse_checkout_locks', JSON.stringify(lockList));
    }

    router.push(`/book/${scheduleId}/${primaryLockId}?seats=${seatIdsParam}&labels=${encodeURIComponent(labelsParam)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <TransitLoader caption="SYNCHRONIZING SEAT DECK" />
      </div>
    );
  }

  const selectedList = Array.from(activeLocks.values());
  const selectedSeatIds = selectedList.map((l) => l.seatId);

  const farePaise = schedule
    ? typeof schedule.fare === 'object'
      ? schedule.fare.amountPaise
      : schedule.fare
    : 0;
  const totalAmountPaise = farePaise * Math.max(1, selectedList.length);

  const earliestExpiry = selectedList.reduce((earliest, cur) => {
    if (!earliest) return cur.expiresAt;
    return new Date(cur.expiresAt) < new Date(earliest) ? cur.expiresAt : earliest;
  }, '');

  return (
    <div className="min-h-screen bg-canvas pb-32">
      <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur-md border-b border-border-hairline shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-ink-secondary hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Schedules</span>
          </Link>
          <div className="flex items-center gap-3">
            <BusVerseLogo size={32} variant="mark" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {schedule && (
          <div className="mb-6 p-5 rounded-2xl bg-surface-card border border-border-hairline shadow-ambient">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-hairline">
              <div>
                <h1 className="text-xl font-extrabold text-ink-bright">
                  {schedule.route.originCity.name} → {schedule.route.destinationCity.name}
                </h1>
                <div className="flex items-center gap-2 text-xs text-ink-secondary mt-0.5">
                  <span className="font-semibold text-ink-bright">{schedule.operatorName}</span>
                  <span>•</span>
                  <span>{schedule.busType}</span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-2xl font-extrabold text-ink-bright">{formatINR(farePaise)}</div>
                <span className="text-[10px] text-ink-muted">per seat (tax included)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 items-center pt-3 text-xs">
              <div>
                <span className="text-ink-muted block text-[10px] font-mono uppercase">Departs</span>
                <span className="font-extrabold text-sm text-ink-bright">
                  {formatISTTime(schedule.departureTime)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-ink-muted block text-[10px] font-mono uppercase">Duration</span>
                <span className="font-semibold text-ink-secondary">
                  {formatDuration(schedule.durationMinutes)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-ink-muted block text-[10px] font-mono uppercase">Arrives</span>
                <span className="font-extrabold text-sm text-ink-bright">
                  {formatISTTime(schedule.arrivalTime)}
                </span>
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-danger-subtle border border-danger-crimson text-danger-crimson text-xs font-semibold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => loadData()}
              className="p-1 rounded hover:bg-danger-crimson/10 text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div className="mb-6">
          <SeatLegend />
        </div>

        {seats.length > 0 && (
          <div className="my-8">
            <SeatDeck
              seats={seats}
              layout={layout || { rowsCount: 10, columnsCount: 4, aisleCells: [] }}
              selectedSeatIds={selectedSeatIds}
              onSeatClick={handleSeatClick}
              disabled={locking}
            />
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-card/95 backdrop-blur-md border-t border-border-strong shadow-modal p-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {selectedList.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-ink-secondary">Selected:</span>
                  {selectedList.map((l) => (
                    <span
                      key={l.seatId}
                      className="text-xs font-mono font-extrabold text-brand-primary px-2 py-0.5 rounded bg-brand-subtle border border-brand-border"
                    >
                      {l.seatLabel}
                    </span>
                  ))}
                  <span className="text-[11px] font-semibold text-ink-muted">
                    ({selectedList.length} {selectedList.length === 1 ? 'seat' : 'seats'})
                  </span>
                </div>
                {earliestExpiry && (
                  <div className="mt-1">
                    <LockCountdown expiresAt={earliestExpiry} onExpire={handleLockExpire} />
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs font-semibold text-ink-muted">
                Tap up to {MAX_SEATS_PER_BOOKING} available seats on the coach deck to reserve
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            {selectedList.length > 0 && (
              <div className="text-right">
                <div className="text-xs text-ink-muted">Total Fare</div>
                <div className="text-lg font-extrabold text-ink-bright">
                  {formatINR(totalAmountPaise)}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleProceedToBooking}
              disabled={selectedList.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold rounded-xl bg-brand-primary text-white hover:bg-brand-hover shadow-glow disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <span>Continue ({selectedList.length} {selectedList.length === 1 ? 'Seat' : 'Seats'})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={async () => {
          const freshSeats = await loadData();
          if (pendingSeat) {
            const realMatch = freshSeats.find((s) => s.seatLabel === pendingSeat.seatLabel) || pendingSeat;
            executeLock(realMatch);
            setPendingSeat(null);
          }
        }}
      />
    </div>
  );
}