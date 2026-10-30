'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Route } from '../api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Map, ArrowRight } from 'lucide-react';

const columns: ColumnDef<Route>[] = [
  {
    accessorKey: 'originCity.name',
    header: 'Origin',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Map size={16} className="text-brand-text" />
        <span className="font-semibold text-ink-bright">{row.original.originCity?.name || 'Unknown'}</span>
      </div>
    ),
  },
  {
    id: 'arrow',
    header: '',
    cell: () => <ArrowRight size={16} className="text-ink-muted" />,
  },
  {
    accessorKey: 'destinationCity.name',
    header: 'Destination',
    cell: ({ row }) => <span className="font-semibold text-ink-bright">{row.original.destinationCity?.name || 'Unknown'}</span>,
  },
  {
    accessorKey: 'approvalStatus',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.approvalStatus;
      return (
        <Badge tone={status === 'APPROVED' ? 'emerald' : status === 'PENDING' ? 'amber' : 'red'}>
          {status}
        </Badge>
      );
    },
  },
];

export function RouteTable({ data, isLoading }: { data?: Route[]; isLoading: boolean }) {
  return <DataTable columns={columns} data={data || []} isLoading={isLoading} />;
}