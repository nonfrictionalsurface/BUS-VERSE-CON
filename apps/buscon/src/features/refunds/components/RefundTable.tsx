'use client';

import { useRefunds } from '../hooks/useRefunds';
import { ColumnDef } from '@tanstack/react-table';
import { RefundRequest } from '../api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { formatIST, formatINR } from '@/lib/utils/formatters';
import { Info } from 'lucide-react';

export function RefundTable() {
  const { data, isLoading } = useRefunds();

  const columns: ColumnDef<RefundRequest>[] = [
    { accessorKey: 'bookingReference', header: 'Booking Ref', cell: ({ row }) => <span className="font-mono font-bold text-ink-bright">{row.original.bookingReference}</span> },
    { accessorKey: 'amountPaise', header: 'Amount', cell: ({ row }) => <span className="font-bold text-brand-text">{formatINR(row.original.amountPaise)}</span> },
    { accessorKey: 'reason', header: 'Reason', cell: ({ row }) => <span className="text-sm text-ink-secondary max-w-[200px] truncate">{row.original.reason}</span> },
    { accessorKey: 'requestedAt', header: 'Requested', cell: ({ row }) => <span className="text-sm">{formatIST(row.original.requestedAt)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
      <Badge tone={
        row.original.status === 'COMPLETED' ? 'emerald' :
        row.original.status === 'FAILED' ? 'red' : 'amber'
      }>
        {row.original.status}
      </Badge>
    )},
  ];

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 text-xs flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          <strong>Read-only view.</strong> Refunds are auto-processed by the payment webhook.
          For manual refunds, use the Payments page (Phase 2) — the backend endpoint is <code>POST /admin/payments/:id/refund</code>.
        </span>
      </div>
      <DataTable columns={columns} data={data || []} isLoading={isLoading} />
    </div>
  );
}