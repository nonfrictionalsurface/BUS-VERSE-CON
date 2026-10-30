'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { AdminOperator, OperatorStatus } from '../api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useSuspendOperator, useUnsuspendOperator } from '../hooks/useAdminOperators';
import { Building2, ShieldAlert, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import { formatIST } from '@/lib/utils/formatters';
import { SuspendModal } from './SuspendModal';
import { isApiError } from '@/lib/api/errors';

const statusBadge = (status: OperatorStatus) => {
  switch (status) {
    case 'APPROVED': return <Badge tone="emerald">APPROVED</Badge>;
    case 'APPLIED': return <Badge tone="amber">APPLIED</Badge>;
    case 'SUSPENDED': return <Badge tone="red">SUSPENDED</Badge>;
    case 'DEACTIVATED': return <Badge tone="slate">DEACTIVATED</Badge>;
  }
};

export function OperatorTable({ data, isLoading }: { data?: AdminOperator[]; isLoading: boolean }) {
  const [suspendTarget, setSuspendTarget] = useState<AdminOperator | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const suspendMutation = useSuspendOperator();
  const unsuspendMutation = useUnsuspendOperator();

  const handleSuspend = async (reason: string) => {
    if (!suspendTarget) return;
    setError(null);
    try {
      await suspendMutation.mutateAsync({ id: suspendTarget.id, reason });
      setSuspendTarget(null);
    } catch (err) {
      if (isApiError(err)) setError({ message: err.message, code: err.code });
      else setError({ message: 'Failed to suspend operator.' });
    }
  };

  const handleUnsuspend = async (op: AdminOperator) => {
    if (!confirm(`Reinstate ${op.companyName}? This will restore their access.`)) return;
    setError(null);
    try {
      await unsuspendMutation.mutateAsync(op.id);
    } catch (err) {
      if (isApiError(err)) setError({ message: err.message, code: err.code });
      else setError({ message: 'Failed to reinstate operator.' });
    }
  };

  const columns: ColumnDef<AdminOperator>[] = [
    {
      accessorKey: 'companyName',
      header: 'Company',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-md text-amber-600">
            <Building2 size={16} />
          </div>
          <div>
            <p className="font-semibold text-ink-bright">{row.original.companyName}</p>
            <p className="text-xs text-ink-secondary font-mono">{row.original.gstin}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Contact',
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-ink-primary">{row.original.email}</p>
          <p className="text-xs text-ink-secondary">{row.original.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => <span className="text-xs text-ink-secondary">{formatIST(row.original.createdAt)}</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        if (row.original.status === 'APPROVED') {
          return (
            <Button
              size="sm"
              variant="secondary"
              className="text-danger-crimson hover:bg-danger-crimson/10"
              onClick={() => setSuspendTarget(row.original)}
            >
              <ShieldAlert size={14} className="mr-1" /> Suspend
            </Button>
          );
        }
        if (row.original.status === 'SUSPENDED') {
          return (
            <Button
              size="sm"
              variant="secondary"
              className="text-emerald-600 hover:bg-emerald-500/10"
              onClick={() => handleUnsuspend(row.original)}
              loading={unsuspendMutation.isPending}
              title="Uses the /approve endpoint to reinstate"
            >
              <ShieldCheck size={14} className="mr-1" /> Reinstate
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <>
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-danger-crimson/10 border border-danger-crimson/30 text-danger-crimson text-sm flex items-start gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error.message}</p>
            {error.code && <p className="text-xs font-mono opacity-80 mt-1">Code: {error.code}</p>}
          </div>
          <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}
      <DataTable columns={columns} data={data || []} isLoading={isLoading} />
      <SuspendModal
        isOpen={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspend}
        operatorName={suspendTarget?.companyName || ''}
        isLoading={suspendMutation.isPending}
      />
    </>
  );
}