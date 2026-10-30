'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Driver, KycStatus } from '../api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRemoveDriver } from '../hooks/useDrivers';
import { Trash2, UserCircle, Phone, CreditCard } from 'lucide-react';
import { isApiError, getErrorMessage } from '@/lib/api/errors';

const getKycBadge = (status: KycStatus) => {
  switch (status) {
    case 'VERIFIED':
    case 'ACTIVE':
      return <Badge tone="emerald">{status}</Badge>;
    case 'KYC_PENDING':
    case 'SIGNED_UP':
      return <Badge tone="amber">{status.replace('_', ' ')}</Badge>;
    case 'INVITED':
      return <Badge tone="slate">{status}</Badge>;
    case 'BLOCKED':
    case 'KYC_FAILED':
    case 'DEACTIVATED':
      return <Badge tone="red">{status.replace('_', ' ')}</Badge>;
    default:
      return <Badge tone="slate">{status}</Badge>;
  }
};

export function DriverTable({ data, isLoading }: { data?: Driver[]; isLoading: boolean }) {
  const removeMutation = useRemoveDriver();
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this driver?')) return;
    setError(null);
    try {
      await removeMutation.mutateAsync(id);
    } catch (err) {
      setError(isApiError(err) ? getErrorMessage(err.code, err.message) : 'Failed to remove driver.');
    }
  };

  const columns: ColumnDef<Driver>[] = [
    {
      accessorKey: 'name',
      header: 'Driver',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-signal-emerald/10 text-brand-text flex items-center justify-center">
            <UserCircle size={18} />
          </div>
          <div>
            <p className="font-semibold text-ink-bright">{row.original.name}</p>
            <p className="text-xs text-ink-secondary flex items-center gap-1">
              <Phone size={10} /> {row.original.phone}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'licenseNumber',
      header: 'License No.',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm text-ink-secondary font-mono">
          <CreditCard size={14} className="text-ink-muted" />
          {row.original.licenseNumber}
        </div>
      ),
    },
    {
      accessorKey: 'kycStatus',
      header: 'KYC Status',
      cell: ({ row }) => getKycBadge(row.original.kycStatus),
    },
    {
      accessorKey: 'onDuty',
      header: 'Duty',
      cell: ({ row }) => (
        row.original.onDuty ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand-text">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span> On Trip
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-ink-muted"></span> Off Duty
          </span>
        )
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleRemove(row.original.id)}
          disabled={row.original.onDuty || removeMutation.isPending}
          title={row.original.onDuty ? "Cannot remove driver while on duty" : "Remove driver"}
          className="text-danger-crimson hover:bg-danger-crimson/10"
        >
          <Trash2 size={16} />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-danger-crimson/10 text-danger-crimson text-sm font-medium border border-danger-crimson/20">
          {error}
        </div>
      )}
      <DataTable columns={columns} data={data || []} isLoading={isLoading} />
    </div>
  );
}