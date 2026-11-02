'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { bookingApi } from '@/features/booking/api/booking.api';
import { formatINR, formatISTDate } from '@/lib/utils/formatters';
import { Loader2, ArrowRight } from 'lucide-react';

export default function BookingsListPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingApi
      .getBookingsList()
      .then((res) => setBookings(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-sans text-2xl font-bold text-ink-bright mb-6">My Bookings</h1>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
          </div>
        ) : bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.bookingId} className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-ambient">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-ink-bright">{b.bookingReference}</span>
                    <span className="rounded bg-brand-primary-subtle px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                      {b.status}
                    </span>
                  </div>
                  <div className="text-xs text-ink-secondary mt-1">
                    {b.routeSummary?.originCity} → {b.routeSummary?.destinationCity} · {formatISTDate(b.departureTime)}
                  </div>
                  <div className="font-mono text-sm font-extrabold text-ink-bright mt-2">
                    {formatINR(b.totalFarePaise)}
                  </div>
                </div>

                <Link
                  href={`/bookings/${b.bookingId}`}
                  className="flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface-sunken px-3.5 py-2 text-xs font-bold text-ink-bright hover:border-brand-primary"
                >
                  <span>View Pass</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-xs text-ink-secondary">
            You have no booked trips yet.
          </div>
        )}
      </main>
    </div>
  );
}
