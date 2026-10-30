'use client';

import { useAdminBookings } from '@/features/admin-bookings/hooks/useAdminBookings';
import { AdminBookingTable } from '@/features/admin-bookings/components/AdminBookingTable';

export default function AdminBookingsPage() {
  const { data, isLoading } = useAdminBookings();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold text-ink-bright tracking-tight">All Bookings</h1>
        <p className="text-sm text-ink-secondary mt-1">Cross-operator booking oversight. Passenger PII is masked by default.</p>
      </div>
      <AdminBookingTable data={data} isLoading={isLoading} />
    </div>
  );
}