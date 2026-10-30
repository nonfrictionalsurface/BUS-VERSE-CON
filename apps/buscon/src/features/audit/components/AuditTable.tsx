'use client';

import { useAuditLogs } from '../hooks/useAudit';
import { ColumnDef } from '@tanstack/react-table';
import { AuditLog } from '../api';
import { DataTable } from '@/components/ui/DataTable';
import { formatIST } from '@/lib/utils/formatters';
import { FileText, User, Activity, Bot } from 'lucide-react';

export function AuditTable() {
  const { data, isLoading } = useAuditLogs();

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Timestamp',
      cell: ({ row }) => <span className="text-xs font-mono text-ink-secondary">{formatIST(row.original.createdAt)}</span>,
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: ({ row }) => {
        const email = row.original.actorEmail;
        const role = row.original.actorRole;

        if (!email || !role) {
          return (
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-surface-sunken text-ink-muted">
                <Bot size={14} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink-bright">System</p>
                <p className="text-[10px] uppercase text-ink-muted font-bold">Automated Action</p>
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <User size={14} className="text-ink-muted" />
            <div>
              <p className="text-sm font-medium text-ink-bright">{email}</p>
              <p className="text-[10px] uppercase text-brand-text font-bold">
                {String(role).replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface-sunken rounded text-xs font-bold text-ink-primary border border-line-hairline">
          <Activity size={12} /> {row.original.action || 'unknown'}
        </span>
      ),
    },
    {
      id: 'entity',
      header: 'Entity',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm text-ink-secondary">
          <FileText size={14} />
          {row.original.entity || row.original.entityType || 'unknown'}
        </div>
      ),
    },
    {
      accessorKey: 'reason',
      header: 'Reason / Metadata',
      cell: ({ row }) => (
        <span className="text-xs text-ink-secondary line-clamp-2 max-w-[250px]" title={row.original.reason || ''}>
          {row.original.reason || '-'}
        </span>
      ),
    },
  ];

  return <DataTable columns={columns} data={data || []} isLoading={isLoading} />;
}