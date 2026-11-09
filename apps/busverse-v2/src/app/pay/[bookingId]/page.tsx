'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { bookingsApi, BookingDetail } from '@/lib/api/bookings.api';
import { paymentsApi } from '@/lib/api/payments.api';
import { Button } from '@/components/ui/Button';
import { formatINR, formatISTTime } from '@/lib/utils/formatters';

type Phase = 'idle' | 'initiating' | 'polling' | 'succeeded' | 'failed' | 'expired';

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams<{ bookingId: string }>();
  const bookingId = params?.bookingId;
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/pay/${bookingId}`)}`);
    }
  }, [authLoading, isAuthenticated, bookingId, router]);

  useEffect(() => {
    if (!bookingId || !isAuthenticated) return;
    (async () => {
      try {
        const b = await bookingsApi.getBooking(bookingId);
        setBooking(b);
        // If already confirmed, redirect to ticket immediately
        if (b.status === 'CONFIRMED') {
          router.replace(`/bookings/${bookingId}`);
        }
      } catch (err: any) {
        setError(err?.message ?? 'Could not load booking.');
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId, isAuthenticated, router]);

  const startPayment = useCallback(async () => {
    if (!bookingId) return;
    setError(null);
    setPhase('initiating');

    try {
      const initiated = await paymentsApi.initiate(bookingId);
      setPaymentId(initiated.paymentId);
      setPhase('polling');

      // In dev: mock-confirm immediately
      if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
        console.log('[payments] DEV mode — calling mockConfirm for', initiated.paymentId);
        try {
          await paymentsApi.mockConfirm(initiated.paymentId);
        } catch (e) {
          console.warn('[payments] mockConfirm failed:', e);
        }
      }

      // Poll until SUCCEEDED
      const startAt = Date.now();
      const MAX_POLL_MS = 60_000;
      while (Date.now() - startAt < MAX_POLL_MS) {
        const status = await paymentsApi.getStatus(initiated.paymentId);
        console.log('[payments] poll:', status.status);
        if (status.status === 'SUCCEEDED') {
          setPhase('succeeded');
          router.replace(`/bookings/${bookingId}`);
          return;
        }
        if (status.status === 'FAILED') {
          setPhase('failed');
          setError('Payment failed. Please try again.');
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      setError('Payment is taking longer than expected. Please check My Trips.');
      setPhase('failed');
    } catch (err: any) {
      console.error('[payments] error:', err);
      setPhase('failed');
      setError(err?.message ?? 'Could not initiate payment.');
    }
  }, [bookingId, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <span className="inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-secondary">Loading booking…</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-text-primary">{error}</p>
        <Link href="/" className="text-brand hover:underline font-semibold">
          Back to home
        </Link>
      </div>
    );
  }

  if (!booking) return null;

  const isExpired = booking.status === 'EXPIRED' || booking.status === 'FAILED';
  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'OPERATOR_CANCELLED';

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="border-b border-border-hairline bg-surface">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
            ← Home
          </Link>
          <p className="text-sm font-semibold text-text-primary">Payment</p>
          <div className="w-12" />
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          {isExpired && (
            <div className="p-4 bg-[var(--danger-crimson-subtle)] border border-[var(--danger-crimson)] rounded-lg text-sm text-[var(--danger-crimson)]">
              This booking has expired. Please search again.
              <Link href="/search" className="block mt-2 font-semibold underline">Search buses</Link>
            </div>
          )}
          {isCancelled && (
            <div className="p-4 bg-[var(--warning-amber-subtle)] border border-[var(--warning-amber)] rounded-lg text-sm text-[var(--warning-amber)]">
              This booking is cancelled.
            </div>
          )}

          {booking.schedule && (
            <div className="p-4 bg-surface border border-border-hairline rounded-lg">
              <p className="text-lg font-bold text-text-bright">
                {booking.schedule.originCityName} → {booking.schedule.destinationCityName}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{booking.schedule.operatorName}</p>
              <div className="flex items-center gap-3 mt-3 text-sm">
                <span className="font-mono font-bold text-text-bright">
                  {formatISTTime(booking.schedule.departureTime)}
                </span>
                <span className="text-text-muted">→</span>
                <span className="font-mono font-bold text-text-bright">
                  {formatISTTime(booking.schedule.arrivalTime)}
                </span>
              </div>
            </div>
          )}

          <div className="p-4 bg-surface border border-border-hairline rounded-lg">
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
              Booking
            </p>
            <p className="text-sm font-mono text-text-bright">{booking.bookingReference}</p>
            <p className="text-xs text-text-muted mt-1">
              {booking.passengers.length} {booking.passengers.length === 1 ? 'seat' : 'seats'} ·{' '}
              {booking.passengers.map((p) => p.seatLabel ?? p.seatId.slice(0, 6)).join(', ')}
            </p>
          </div>

          <div className="p-4 bg-surface border border-border-strong rounded-lg">
            <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
              <span className="text-sm font-semibold text-text-bright">Total</span>
              <span className="text-2xl font-extrabold font-mono text-text-bright">
                {formatINR(booking.totalFarePaise)}
              </span>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-[var(--danger-crimson)]">{error}</p>
            )}

            {!isExpired && !isCancelled && (
              <Button
                onClick={startPayment}
                loading={phase === 'initiating' || phase === 'polling'}
                disabled={phase === 'succeeded'}
                fullWidth
                className="mt-4"
              >
                {phase === 'initiating' && 'Opening payment…'}
                {phase === 'polling' && 'Confirming payment…'}
                {phase === 'succeeded' && 'Confirmed ✓'}
                {(phase === 'idle' || phase === 'failed') && `Pay ${formatINR(booking.totalFarePaise)}`}
              </Button>
            )}
          </div>

          <p className="text-xs text-text-muted text-center">
            Payments are simulated in dev mode. Production uses Razorpay.
          </p>
        </div>
      </main>
    </div>
  );
}