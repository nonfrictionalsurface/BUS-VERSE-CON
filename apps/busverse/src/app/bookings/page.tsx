'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchPassengerBookings } from '@/features/tickets/api/tickets.api';
import { BookingResponse } from '@/features/booking/types';
import { formatINR, formatISTTime, formatISTDate } from '@/lib/utils/formatters';
import { TransitLoader } from '@/components/brand/TransitLoader';
import { ThemeToggle } from '@/lib/theme/ThemeToggle';
import { BusVerseLogo } from '@/components/brand/BusVerseLogo';
import { ArrowLeft, Ticket, ArrowRight, ShieldCheck, Bus } from 'lucide-react';

export default function MyTripsPage() {
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchPassengerBookings(20);
        setBookings(res.data);
      } catch (e) {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-canvas pb-20">
      <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur-md border-b border-border-hairline shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-ink-secondary hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Search Home</span>
          </Link>
          <div className="flex items-center gap-3">
            <BusVerseLogo size={32} variant="mark" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        <h1 className="text-2xl font-black text-ink-bright tracking-tight mb-2">My Bookings</h1>
        <p className="text-xs text-ink-secondary mb-6">Manage confirmed boarding passes and review past journeys</p>

        {loading ? (
          <div className="py-12 flex justify-center">
            <TransitLoader caption="LOCATING TRIPS" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-surface-card border border-border-hairline shadow-ambient">
            <Ticket className="w-10 h-10 text-ink-muted mx-auto mb-3" />
            <h3 className="text-base font-bold text-ink-bright">No Bookings Yet</h3>
            <p className="text-xs text-ink-secondary mt-1 mb-6">
              Search for coaches across verified intercity routes to reserve your first journey.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-brand-primary text-white hover:bg-brand-hover shadow-glow"
            >
              <span>Explore Routes</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <Link
                key={b.bookingId}
                href={`/bookings/${b.bookingId}`}
                className="block p-5 rounded-2xl bg-surface-card border border-border-hairline hover:border-brand-primary shadow-ambient transition-all duration-200"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-brand-primary" />
                    <span className="font-mono text-xs font-bold text-ink-bright">
                      {b.bookingReference}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      b.status === 'CONFIRMED'
                        ? 'bg-signal-subtle border-signal-emerald text-signal-emerald'
                        : b.status === 'CANCELLED'
                        ? 'bg-danger-subtle border-danger-crimson text-danger-crimson'
                        : 'bg-surface-sunken text-ink-muted'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 text-xs">
                  <div>
                    <div className="font-extrabold text-ink-bright">
                      {b.boardingStand?.name || 'Origin'} → {b.droppingStand?.name || 'Destination'}
                    </div>
                    <div className="text-[11px] text-ink-muted mt-0.5">
                      {b.createdAt ? formatISTDate(b.createdAt) : 'Confirmed Pass'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-sm text-ink-bright">
                      {formatINR(b.totalFarePaise || 0)}
                    </div>
                    <div className="text-[10px] text-brand-primary font-bold flex items-center gap-1 justify-end mt-0.5">
                      <span>View Pass</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}