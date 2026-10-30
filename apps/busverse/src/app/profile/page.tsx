'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchMyBookings } from '@/features/booking/api/booking.api';
import { AppHeader } from '@/components/layout/AppHeader';
import { TransitLoader } from '@/components/brand/TransitLoader';
import { formatINR, formatISTTime } from '@/lib/utils/formatters';
import {
  User,
  Phone,
  ShieldCheck,
  LogOut,
  Ticket,
  ArrowRight,
  Clock,
  MapPin,
  AlertCircle,
  Armchair,
  RefreshCw,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBookings = async () => {
    setErrorMsg(null);
    try {
      const data = await fetchMyBookings();
      setBookings(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load booking history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/');
      return;
    }
    loadBookings();
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <TransitLoader caption="LOADING YOUR TICKET VAULT" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-24">
      <AppHeader backHref="/" backLabel="All Schedules" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Profile Card */}
        <section className="p-6 rounded-3xl bg-surface-card border border-border-hairline shadow-ambient">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-subtle border-2 border-brand-border flex items-center justify-center text-brand-primary">
                <User className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold text-ink-bright">
                    {user?.name || 'Verified Passenger'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-signal-subtle text-signal-emerald border border-signal-emerald/30">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-muted mt-1 font-mono">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{user?.phone || 'E.164 Authenticated'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-canvas border border-border-strong text-ink-secondary hover:text-danger-crimson hover:border-danger-crimson/40 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </section>

        {/* Tickets Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-brand-primary" />
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-ink-bright">
                Your Tickets & Reservations ({bookings.length})
              </h2>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                loadBookings();
              }}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink-bright hover:bg-surface-elevated transition-colors text-xs flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-danger-subtle border border-danger-crimson text-danger-crimson text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {bookings.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-surface-card border border-border-hairline shadow-ambient">
              <Ticket className="w-12 h-12 text-ink-muted mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-bold text-ink-bright">No Bookings Found</h3>
              <p className="text-xs text-ink-secondary mt-1 max-w-sm mx-auto">
                You haven&apos;t reserved any journeys yet. Browse available intercity routes to book a seat.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-hover shadow-glow transition-all"
              >
                <span>Find Bus Schedules</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const bId = booking.id || booking.bookingId;
                const ref = booking.bookingReference || booking.reference || bId.slice(0, 8);
                const isConfirmed = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED';
                const isPending = booking.status === 'PENDING';

                const routeOrigin =
                  booking.schedule?.route?.originCity?.name ||
                  booking.originCity ||
                  booking.boardingStand?.name ||
                  'Departure';
                const routeDestination =
                  booking.schedule?.route?.destinationCity?.name ||
                  booking.destinationCity ||
                  booking.droppingStand?.name ||
                  'Arrival';

                const depTime = booking.schedule?.departureTime || booking.departureTime;
                const passengers = booking.passengers || [];
                const seatLabels = passengers
                  .map((p: any) => p.seatLabel || p.seat?.label)
                  .filter(Boolean);

                const fareAmount =
                  booking.totalFareAmount || booking.totalFarePaise || booking.totalAmountPaise || 0;

                return (
                  <div
                    key={bId}
                    className="p-5 rounded-2xl bg-surface-card border border-border-hairline shadow-ambient hover:border-brand-border/60 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border-hairline gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-extrabold text-ink-bright">
                          {ref}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isConfirmed
                              ? 'bg-signal-subtle text-signal-emerald border border-signal-emerald/30'
                              : isPending
                              ? 'bg-warning-subtle text-amber-500 border border-amber-500/30'
                              : 'bg-canvas text-ink-muted border border-border-strong'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-base font-extrabold text-ink-bright">
                          {formatINR(fareAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-4 text-xs items-center">
                      <div className="sm:col-span-6">
                        <div className="flex items-center gap-2 text-sm font-extrabold text-ink-bright">
                          <MapPin className="w-4 h-4 text-brand-primary flex-shrink-0" />
                          <span>{routeOrigin} → {routeDestination}</span>
                        </div>
                        {depTime && (
                          <div className="flex items-center gap-1.5 text-xs text-ink-secondary mt-1">
                            <Clock className="w-3.5 h-3.5 text-ink-muted" />
                            <span>Departure: {formatISTTime(depTime)}</span>
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-6 flex flex-wrap items-center sm:justify-end gap-1.5">
                        <Armchair className="w-3.5 h-3.5 text-brand-primary" />
                        <span className="text-xs text-ink-muted">Seats:</span>
                        {seatLabels.length > 0 ? (
                          seatLabels.map((lbl: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-subtle text-brand-primary border border-brand-border"
                            >
                              {lbl}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-mono font-bold text-ink-secondary">
                            {passengers.length || 1} Seat(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border-hairline flex items-center justify-between gap-3">
                      <span className="text-[11px] font-mono text-ink-muted">
                        Booked: {new Date(booking.createdAt || Date.now()).toLocaleDateString('en-IN')}
                      </span>

                      {isConfirmed ? (
                        <Link
                          href={`/bookings/${bId}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-hover shadow-glow transition-all"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>View Boarding Ticket</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : isPending ? (
                        <Link
                          href={`/pay/${bId}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all"
                        >
                          <span>Complete Payment</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span className="text-xs text-ink-muted font-medium">Inactive</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}