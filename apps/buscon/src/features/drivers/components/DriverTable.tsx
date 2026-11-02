'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Driver, KycStatus } from '../api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRemoveDriver, useVerifyDriver } from '../hooks/useDrivers';
import { Trash2, UserCircle, Phone, CreditCard, CheckCircle2, Sparkles } from 'lucide-react';
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
      return <Badge tone="amber">{status}</Badge>;
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
  const verifyMutation = useVerifyDriver();
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this driver?')) return;
    setError(null);
    try {
      await removeMutation.mutateAsync(id);
    } catch (err) {
      setError(isApiError(err) ? getErrorMessage(err.code, err.message) : 'Failed to remove driver.');
    }
  };

  const handleVerify = async (id: string, name: string) => {
    if (!confirm(`Verify ${name}?\n\nThis marks their KYC as VERIFIED (dev mode). They become assignable to trips.`)) return;
    setError(null);
    setVerifyingId(id);
    try {
      await verifyMutation.mutateAsync(id);
    } catch (err) {
      setError(isApiError(err) ? getErrorMessage(err.code, err.message) : 'Failed to verify driver.');
    } finally {
      setVerifyingId(null);
    }
  };

  const columns: ColumnDef<Driver>[] = [
    {
      accessorKey: 'name',
      header: 'Driver',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand/10 text-brand-text flex items-center justify-center">
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
      cell: ({ row }) => {
        const driver = row.original;
        const needsVerify = driver.kycStatus === 'INVITED' || driver.kycStatus === 'SIGNED_UP' || driver.kycStatus === 'KYC_PENDING';
        return (
          <div className="flex items-center gap-2">
            {needsVerify && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleVerify(driver.id, driver.name)}
                loading={verifyingId === driver.id}
                className="text-brand-text hover:bg-brand/10"
                title="Dev-only: mark this driver as VERIFIED so they can be assigned to trips"
              >
                <Sparkles size={14} className="mr-1" /> Verify
              </Button>
            )}
            {driver.kycStatus === 'VERIFIED' && (
              <span className="text-xs text-brand-text flex items-center gap-1">
                <CheckCircle2 size={12} /> Ready to assign
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(driver.id)}
              disabled={driver.onDuty || removeMutation.isPending}
              title={driver.onDuty ? 'Cannot remove driver while on duty' : 'Remove driver'}
              className="text-danger-crimson hover:bg-danger-crimson/10"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        );
      },
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