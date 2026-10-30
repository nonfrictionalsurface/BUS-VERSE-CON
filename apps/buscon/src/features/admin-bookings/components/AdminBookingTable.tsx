'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminBooking } from '../api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowRight, User, Armchair, Building2, AlertTriangle } from 'lucide-react';
import { formatIST, formatINR } from '@/lib/utils/formatters';

export function AdminBookingTable({ data, isLoading }: { data?: AdminBooking[]; isLoading: boolean }) {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Backend endpoint not available</p>
            <p className="text-xs mt-1 font-mono">{error}</p>
            <p className="text-xs mt-2">The <code>GET /v1/admin/bookings</code> endpoint may not be implemented yet. Cross-operator bookings will appear here once the backend supports it.</p>
          </div>
        </div>
      </div>
    );
  }

  const columns: ColumnDef<AdminBooking>[] = [
    {
      accessorKey: 'bookingReference',
      header: 'Ref',
      cell: ({ row }) => <span className="font-mono text-xs font-bold text-ink-secondary">{row.original.bookingReference}</span>,
    },
    {
      id: 'operator',
      header: 'Operator',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm text-ink-secondary">
          <Building2 size={14} className="text-ink-muted" />
          {row.original.operatorName || 'Unknown'}
        </div>
      ),
    },
    {
      id: 'route',
      header: 'Route',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm font-medium text-ink-bright">
          {row.original.routeSummary?.originCity} <ArrowRight size={12} className="text-ink-muted" /> {row.original.routeSummary?.destinationCity}
        </div>
      ),
    },
    {
      id: 'passengers',
      header: 'Passengers (masked)',
      cell: ({ row }) => {
        const p = row.original.passengers || [];
        return (
          <div className="flex flex-col gap-1">
            {p.slice(0, 2).map((pax, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-ink-secondary">
                <User size={12} className="text-ink-muted" />
                <span>{pax.name}</span>
                <span className="flex items-center gap-0.5 bg-surface-sunken px-1.5 py-0.5 rounded border border-line-hairline">
                  <Armchair size={10} /> {pax.seatLabel}
                </span>
              </div>
            ))}
            {p.length > 2 && <span className="text-xs text-ink-muted">+{p.length - 2} more</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'totalFarePaise',
      header: 'Fare',
      cell: ({ row }) => <span className="font-mono text-sm font-medium text-brand-text">{formatINR(row.original.totalFarePaise)}</span>,
    },
    {
      accessorKey: 'departureTime',
      header: 'Departure',
      cell: ({ row }) => <span className="text-xs text-ink-secondary">{formatIST(row.original.departureTime)}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        return <Badge tone={s === 'CONFIRMED' ? 'emerald' : s === 'CANCELLED' ? 'red' : 'amber'}>{s}</Badge>;
      },
    },
  ];

  return <DataTable columns={columns} data={data || []} isLoading={isLoading} />;
}