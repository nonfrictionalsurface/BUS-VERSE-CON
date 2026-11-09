'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@/lib/api/bookings.api';
import type { SeatLock } from '@/features/seats/api/seats.api';
import { PassengerForm, PassengerInput } from '@/features/booking/PassengerForm';

export default function PassengersPage() {
  const router = useRouter();
  const params = useParams<{ scheduleId: string }>();
  const scheduleId = params?.scheduleId;

  const { isAuthenticated, loading: authLoading } = useAuth();
  const [locks, setLocks] = useState<SeatLock[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem('busverse_checkout_locks');
    if (!raw) { setLocks([]); return; }
    try { setLocks(JSON.parse(raw) as SeatLock[]); } catch { setLocks([]); }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/booking/${scheduleId}/passengers`)}`);
    }
  }, [authLoading, isAuthenticated, scheduleId, router]);

  useEffect(() => {
    if (locks !== null && locks.length === 0 && isAuthenticated) {
      router.replace(`/booking/${scheduleId}`);
    }
  }, [locks, isAuthenticated, scheduleId, router]);

  const { data: schedule, isLoading: scheduleLoading, error: scheduleError, refetch } = useQuery({
    queryKey: ['schedule-detail', scheduleId],
    queryFn: () => bookingsApi.getScheduleDetail(scheduleId!),
    enabled: !!scheduleId && isAuthenticated,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const handleSubmit = useCallback(
    async ({
      boardingStandId,
      droppingStandId,
      passengers,
    }: {
      boardingStandId: string;
      droppingStandId: string;
      passengers: PassengerInput[];
    }) => {
      if (!scheduleId || !locks) return;
      setSubmitting(true);
      setError(null);
      try {
        const result = await bookingsApi.createBooking({
          scheduleId,
          lockIds: locks.map((l) => l.lockId),
          boardingStandId,
          droppingStandId,
          passengers: passengers.map((p) => ({
            seatId: p.seatId,
            name: p.name.trim(),
            age: parseInt(p.age, 10),
            gender: p.gender as 'MALE' | 'FEMALE' | 'OTHER',
          })),
        });
        sessionStorage.removeItem('busverse_checkout_locks');
        router.push(`/pay/${result.bookingId}`);
      } catch (err: any) {
        setError(err?.message ?? 'Could not create booking. Try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [scheduleId, locks, router],
  );

  if (authLoading || locks === null) {
    return <div className="min-h-screen flex items-center justify-center text-text-secondary">Loading…</div>;
  }

  if (scheduleLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <span className="inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-secondary">Loading trip details…</p>
      </div>
    );
  }

  if (scheduleError || !schedule) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-text-primary">Couldn&apos;t load trip details.</p>
        <p className="text-sm text-text-muted max-w-md">
          {scheduleError instanceof Error ? scheduleError.message : 'Unknown error'}
        </p>
        <div className="flex gap-3">
          <button onClick={() => refetch()} className="text-brand hover:underline font-semibold">Retry</button>
          <Link href={`/booking/${scheduleId}`} className="text-text-secondary hover:text-text-primary">← Back to seats</Link>
        </div>
      </div>
    );
  }

  if (schedule.stops.length < 2) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-text-primary font-semibold">
          This route has {schedule.stops.length} stop{schedule.stops.length === 1 ? '' : 's'} configured — need at least 2.
        </p>
        <p className="text-sm text-text-muted max-w-md">
          Open DevTools (F12) → Console and copy the <code className="font-mono text-text-bright">[bookings.api] Raw schedule response</code> log line, so the mapper can be fixed.
        </p>
        <Link href={`/booking/${scheduleId}`} className="text-brand hover:underline font-semibold">← Back to seats</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="border-b border-border-hairline bg-surface">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={`/booking/${scheduleId}`} className="text-sm text-text-secondary hover:text-text-primary">← Seats</Link>
          <p className="text-sm font-semibold text-text-primary">Passenger details</p>
          <div className="w-12" />
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="mb-6 p-4 bg-surface border border-border-hairline rounded-lg">
            <p className="text-lg font-bold text-text-bright">
              {schedule.originCityName} → {schedule.destinationCityName}
            </p>
            <p className="text-sm text-text-muted">
              {schedule.operatorName} · {schedule.stops.length} stops
            </p>
          </div>

          <PassengerForm
            scheduleId={scheduleId!}
            locks={locks}
            stops={schedule.stops}
            farePerSeatPaise={schedule.farePaise}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        </div>
      </main>
    </div>
  );
}