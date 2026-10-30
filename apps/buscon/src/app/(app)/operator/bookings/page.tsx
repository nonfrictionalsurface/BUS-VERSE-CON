'use client';

import { useBookings } from '@/features/bookings/hooks/useBookings';
import { BookingTable } from '@/features/bookings/components/BookingTable';

export default function BookingsPage() {
  const { data, isLoading } = useBookings();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Bookings</h1>
          <p className="text-sm text-ink-secondary mt-1">Live ticket sales (passenger PII is masked for privacy).</p>
        </div>
      </div>

      <BookingTable data={data} isLoading={isLoading} />
    </div>
  );
}