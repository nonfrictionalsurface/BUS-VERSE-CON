'use client';

import { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { Bus } from '../api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Bus as BusIcon, ChevronRight } from 'lucide-react';

export function BusTable({ data, isLoading }: { data?: Bus[]; isLoading: boolean }) {
  const router = useRouter();

  const columns: ColumnDef<Bus>[] = [
    {
      accessorKey: 'registrationNumber',
      header: 'Registration',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 rounded-md text-brand-text">
            <BusIcon size={18} />
          </div>
          <span className="font-semibold text-ink-bright">{row.original.registrationNumber}</span>
        </div>
      ),
    },
    {
      accessorKey: 'model',
      header: 'Model',
      cell: ({ row }) => <span className="text-ink-secondary">{row.original.model}</span>,
    },
    {
      accessorKey: 'busType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-xs font-medium bg-surface-sunken px-2 py-1 rounded-md border border-line-hairline">
          {row.original.busType.replace('_', ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => <span className="font-mono">{row.original.capacity} seats</span>,
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
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="group-hover:bg-brand/10 group-hover:text-brand-text"
          onClick={() => router.push(`/operator/buses/${row.original.id}`)}
        >
          Manage <ChevronRight size={16} />
        </Button>
      ),
    },
  ];

  return <DataTable columns={columns} data={data || []} isLoading={isLoading} />;
}