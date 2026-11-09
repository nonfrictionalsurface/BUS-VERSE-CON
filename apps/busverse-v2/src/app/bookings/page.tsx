'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { bookingsApi, BookingDetail } from '@/lib/api/bookings.api';
import { formatINR, formatISTTime, formatISTDate } from '@/lib/utils/formatters';

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'bg-[var(--warning-amber-subtle)] text-[var(--warning-amber)]',
    CONFIRMED: 'bg-[var(--signal-emerald-subtle)] text-[var(--signal-emerald)]',
    CHECKED_IN: 'bg-[var(--signal-emerald-subtle)] text-[var(--signal-emerald)]',
    COMPLETED: 'bg-[var(--surface-sunken)] text-text-muted',
    CANCELLED: 'bg-[var(--surface-sunken)] text-text-muted',
    OPERATOR_CANCELLED: 'bg-[var(--surface-sunken)] text-text-muted',
    REFUNDED: 'bg-[var(--surface-sunken)] text-text-muted',
    EXPIRED: 'bg-[var(--danger-crimson-subtle)] text-[var(--danger-crimson)]',
    FAILED: 'bg-[var(--danger-crimson-subtle)] text-[var(--danger-crimson)]',
  };
  return map[status] ?? 'bg-[var(--surface-sunken)] text-text-muted';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Payment pending',
    CONFIRMED: 'Ready to board',
    CHECKED_IN: 'Boarded',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    OPERATOR_CANCELLED: 'Cancelled by operator',
    REFUNDED: 'Refunded',
    EXPIRED: 'Expired',
    FAILED: 'Failed',
  };
  return map[status] ?? status;
}

export default function BookingsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent('/bookings')}`);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await bookingsApi.listBookings({ limit: 20 });
        if (!cancelled) setBookings(list);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Could not load bookings.');
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (authLoading || bookings === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <span className="inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-secondary">Loading trips…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="border-b border-border-hairline bg-surface">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
            ← Home
          </Link>
          <p className="text-sm font-semibold text-text-primary">My trips</p>
          <div className="w-12" />
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-[var(--danger-crimson-subtle)] border border-[var(--danger-crimson)] text-sm text-[var(--danger-crimson)]">
              {error}
            </div>
          )}

          {bookings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg font-semibold text-text-bright mb-2">No trips yet</p>
              <p className="text-sm text-text-secondary mb-6">
                Book a bus to see your trips here.
              </p>
              <Link href="/search" className="text-brand hover:underline font-semibold">
                Find a bus
              </Link>
            </div>
          )}

          {bookings.map((b) => (
            <Link
              key={b.bookingId}
              href={`/bookings/${b.bookingId}`}
              className="block bg-surface border border-border-hairline rounded-lg p-4 hover:border-border-subtle transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-base font-bold text-text-bright">
                  {b.schedule?.originCityName ?? '—'} → {b.schedule?.destinationCityName ?? '—'}
                </p>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadgeClass(b.status)}`}
                >
                  {statusLabel(b.status)}
                </span>
              </div>

              {b.schedule && (
                <p className="text-xs text-text-muted font-mono">
                  {formatISTDate(b.schedule.departureTime)} · {formatISTTime(b.schedule.departureTime)} → {formatISTTime(b.schedule.arrivalTime)}
                </p>
              )}

              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-text-muted font-mono">{b.bookingReference}</p>
                <p className="text-sm font-bold font-mono text-text-bright">
                  {formatINR(b.totalFarePaise)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}