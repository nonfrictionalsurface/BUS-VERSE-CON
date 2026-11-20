'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Booking } from '../api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, User, Armchair } from 'lucide-react';
import { formatIST, formatINR } from '@/lib/utils/formatters';

const columns: ColumnDef<Booking>[] = [
  {
    accessorKey: 'bookingReference',
    header: 'Reference',
    cell: ({ row }) => <span className="font-mono text-xs font-bold text-ink-primary">{row.original.bookingReference}</span>,
  },
  {
    id: 'route',
    header: 'Route',
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm font-medium text-ink-bright whitespace-nowrap">
        {row.original.routeSummary?.originCity} <ArrowRight size={12} className="text-ink-muted" /> {row.original.routeSummary?.destinationCity}
      </div>
    ),
  },
  {
    accessorKey: 'departureTime',
    header: 'Departure',
    cell: ({ row }) => <span className="text-sm text-ink-secondary whitespace-nowrap">{formatIST(row.original.departureTime)}</span>,
  },
  {
    id: 'passengers',
    header: 'Passengers (Masked)',
    cell: ({ row }) => {
      const p = row.original.passengers || [];
      return (
        <div className="flex flex-col gap-1">
          {p.map((pax, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-ink-secondary whitespace-nowrap">
              <User size={12} className="text-ink-muted shrink-0" />
              <span>{pax.name}</span>
              <span className="flex items-center gap-0.5 bg-surface-sunken px-1.5 py-0.5 rounded border border-line-hairline text-ink-primary">
                <Armchair size={10} /> {pax.seatLabel}
              </span>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: 'totalFarePaise',
    header: 'Total Fare',
    cell: ({ row }) => {
      const r = row.original as any;
      const farePaise = r.totalFarePaise ?? r.totalAmountPaise ?? r.fareAmountPaise ?? r.amountPaise;
      return (
        <span className="font-mono text-sm font-semibold text-ink-bright whitespace-nowrap">
          {formatINR(farePaise)}
        </span>
      );
    },
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

export function BookingTable({ data, isLoading }: { data?: Booking[]; isLoading: boolean }) {
  return <DataTable columns={columns} data={data || []} isLoading={isLoading} />;
}