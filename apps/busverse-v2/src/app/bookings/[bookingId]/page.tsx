'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/auth/AuthContext';
import { bookingsApi, BookingDetail, Ticket } from '@/lib/api/bookings.api';
import { Button } from '@/components/ui/Button';
import {
  formatINR,
  formatISTTime,
  formatISTDate,
  formatDuration,
} from '@/lib/utils/formatters';

export default function TicketPage() {
  // ⭐ ALL HOOKS AT TOP — no conditional calls below
  const router = useRouter();
  const params = useParams<{ bookingId: string }>();
  const bookingId = params?.bookingId;
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrEnlarged, setQrEnlarged] = useState(false);
  const [checkingTrip, setCheckingTrip] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/bookings/${bookingId}`)}`);
    }
  }, [authLoading, isAuthenticated, bookingId, router]);

  useEffect(() => {
    if (!bookingId || !isAuthenticated) return;
    let cancelled = false;

    (async () => {
      try {
        const b = await bookingsApi.getBooking(bookingId);
        if (cancelled) return;
        setBooking(b);

        if (b.status === 'PENDING') {
          router.replace(`/pay/${bookingId}`);
          return;
        }

        if (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN' || b.status === 'COMPLETED') {
          const t = await bookingsApi.getTicket(bookingId);
          if (!cancelled) setTicket(t);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Could not load ticket.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [bookingId, isAuthenticated, router]);

  // ⭐ Fallback: if booking has scheduleId but no embedded schedule, fetch it
  const [fetchedSchedule, setFetchedSchedule] = useState<any>(null);
  useEffect(() => {
    if (!booking || booking.schedule || !booking.scheduleId) return;
    (async () => {
      try {
        const s = await bookingsApi.getScheduleDetail(booking.scheduleId!);
        setFetchedSchedule(s);
      } catch (err) {
        console.warn('[ticket] Could not fetch schedule:', err);
      }
    })();
  }, [booking]);

  const handleTrack = async () => {
    if (!booking) return;
    setCheckingTrip(true);
    try {
      const tripId = await bookingsApi.getTripIdForBooking(booking.bookingId);
      if (tripId) {
        router.push(`/trips/${tripId}/live`);
      } else {
        alert("Trip hasn't started yet. Try again once the driver begins.");
      }
    } catch (err: any) {
      alert(err?.message ?? 'Could not check trip status.');
    } finally {
      setCheckingTrip(false);
    }
  };

  // ⭐ EARLY RETURNS — after all hooks
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <span className="inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-secondary">Loading ticket…</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-text-primary">{error ?? 'Ticket not found.'}</p>
        <Link href="/bookings" className="text-brand hover:underline font-semibold">
          ← My trips
        </Link>
      </div>
    );
  }

  // ⭐ Derived values (no hooks) — safe after early returns
  const isActive = booking.status === 'CONFIRMED';
  const isBoarded = booking.status === 'CHECKED_IN';
  const isDone = booking.status === 'COMPLETED';
  const isCancelled =
    booking.status === 'CANCELLED' ||
    booking.status === 'OPERATOR_CANCELLED' ||
    booking.status === 'REFUNDED';
  const canShowQr = isActive || isBoarded;

  const badgeText = isActive
    ? 'Ready to board'
    : isBoarded
    ? 'Boarded'
    : isDone
    ? 'Trip completed'
    : isCancelled
    ? booking.status === 'OPERATOR_CANCELLED'
      ? 'Cancelled by operator'
      : booking.status === 'REFUNDED'
      ? 'Refunded'
      : 'Cancelled'
    : booking.status;

  const badgeClass = isCancelled || isDone
    ? 'bg-[var(--surface-sunken)] text-text-muted'
    : 'bg-[var(--signal-emerald-subtle)] text-[var(--signal-emerald)] border border-[var(--signal-emerald)]';

  const effectiveSchedule = booking.schedule ?? fetchedSchedule;
  const depIso = effectiveSchedule?.departureTime;
  const arrIso = effectiveSchedule?.arrivalTime;
  const duration =
    depIso && arrIso
      ? Math.round((new Date(arrIso).getTime() - new Date(depIso).getTime()) / 60000)
      : 0;

  const seatLabels = booking.passengers
    .map((p) => p.seatLabel ?? p.seatId.slice(0, 4))
    .join(', ');

  const passengerNames = booking.passengers.map((p) => p.name).join(', ');

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="border-b border-border-hairline bg-surface sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/bookings" className="text-sm text-text-secondary hover:text-text-primary">
            ← My trips
          </Link>
          <p className="text-sm font-semibold text-text-primary">Ticket</p>
          <div className="w-12" />
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="text-center mb-4">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeClass}`}>
              {badgeText}
            </span>
          </div>

          <div className="relative">
            <div className="bg-surface border border-border-strong rounded-3xl overflow-visible shadow-floating">
              <div className="relative p-7 border-b-2 border-dashed border-border-strong">
                <div
                  className="absolute -bottom-[15px] -left-4 w-[30px] h-[30px] rounded-full bg-canvas border border-border-strong"
                  aria-hidden="true"
                />
                <div
                  className="absolute -bottom-[15px] -right-4 w-[30px] h-[30px] rounded-full bg-canvas border border-border-strong"
                  aria-hidden="true"
                />

                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-extrabold text-text-bright tracking-tight">
                    {effectiveSchedule?.originCityName ?? 'Origin'}
                  </span>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--telemetry-cyan)"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  <span className="text-2xl font-extrabold text-text-bright tracking-tight">
                    {effectiveSchedule?.destinationCityName ?? 'Destination'}
                  </span>
                </div>
                <p className="text-xs text-text-muted">
                  {effectiveSchedule?.operatorName ?? ''}
                  {effectiveSchedule?.busType ? ` · ${effectiveSchedule.busType}` : ''}
                </p>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                      Departure
                    </p>
                    <p className="text-sm font-bold text-text-bright mt-0.5">
                      {depIso ? formatISTTime(depIso) : '—'}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {depIso ? formatISTDate(depIso) : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                      Seat{booking.passengers.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm font-bold text-brand mt-0.5 truncate" title={seatLabels}>
                      {seatLabels || '—'}
                    </p>
                    {duration > 0 && (
                      <p className="text-[10px] text-text-muted">{formatDuration(duration)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                      Total fare
                    </p>
                    <p className="text-sm font-bold font-mono text-text-bright mt-0.5">
                      {formatINR(booking.totalFarePaise)}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {booking.passengers.length} {booking.passengers.length === 1 ? 'seat' : 'seats'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-surface-hover flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-text-bright truncate">
                    {passengerNames || 'Passenger'}
                  </p>
                  <p className="text-[11px] font-mono text-text-muted mt-1 truncate">
                    {booking.bookingReference || booking.bookingId.slice(0, 12)}
                  </p>
                  {ticket && canShowQr && (
                    <p className="text-[10px] text-[var(--signal-emerald)] mt-1.5 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--signal-emerald)]" />
                      Cryptographically verified
                    </p>
                  )}
                  {isBoarded && (
                    <p className="text-[10px] text-[var(--signal-emerald)] mt-1.5 font-semibold">
                      ● Boarded
                    </p>
                  )}
                  {isCancelled && (
                    <p className="text-[10px] text-[var(--danger-crimson)] mt-1.5 font-semibold">
                      ● Invalid — cancelled
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => canShowQr && setQrEnlarged(true)}
                  disabled={!canShowQr}
                  className={`w-[90px] h-[90px] bg-white p-1.5 rounded-lg shadow shrink-0 transition-transform ${canShowQr ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                  aria-label="Tap to enlarge QR code"
                >
                  {ticket?.qrPayload && canShowQr ? (
                    <QRCodeSVG
                      value={ticket.qrPayload}
                      size={86}
                      level="L"
                      includeMargin={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-500 text-center px-1 leading-tight">
                      {isCancelled ? 'Cancelled' : isDone ? 'Used' : 'No QR'}
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {canShowQr && ticket?.qrPayload && (
            <p className="text-[11px] text-text-muted text-center mt-3">
              Tap the QR to enlarge — show it to the driver at boarding
            </p>
          )}

          <div className="mt-6 space-y-2">
            {(isActive || isBoarded) && (
              <Button onClick={handleTrack} loading={checkingTrip} fullWidth>
                Track bus live
              </Button>
            )}
            {canShowQr && (
              <Button onClick={() => setQrEnlarged(true)} variant="secondary" fullWidth>
                Show QR at boarding
              </Button>
            )}
            <Link href="/bookings" className="block">
              <Button variant="ghost" fullWidth>
                All trips
              </Button>
            </Link>
          </div>

          <div className="mt-6 p-3 bg-surface border border-border-hairline rounded-lg text-xs text-text-muted space-y-1">
            <p>
              <span className="text-text-secondary">Booking ID:</span>{' '}
              <span className="font-mono text-text-primary">{booking.bookingId}</span>
            </p>
            {booking.confirmedAt && (
              <p>
                <span className="text-text-secondary">Confirmed:</span>{' '}
                {formatISTDate(booking.confirmedAt)} · {formatISTTime(booking.confirmedAt)}
              </p>
            )}
            {booking.gstInvoiceAvailable && (
              <p className="text-[var(--signal-emerald)]">● GST invoice available</p>
            )}
          </div>
        </div>
      </main>

      {qrEnlarged && ticket?.qrPayload && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6"
          onClick={() => setQrEnlarged(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged boarding QR"
        >
          <div
            className="bg-white p-6 rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <QRCodeSVG
              value={ticket.qrPayload}
              size={Math.min(typeof window !== 'undefined' ? window.innerWidth - 100 : 300, 400)}
              level="L"
              includeMargin={false}
            />
          </div>
          <p className="text-white text-sm mt-6 font-semibold">
            {booking.bookingReference}
          </p>
          <p className="text-white/70 text-xs mt-1">
            Show this to the driver · {seatLabels}
          </p>
          <button
            type="button"
            onClick={() => setQrEnlarged(false)}
            className="mt-8 px-6 py-2.5 rounded-lg bg-white text-black font-bold text-sm"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}