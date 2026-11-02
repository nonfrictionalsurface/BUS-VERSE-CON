'use client';

import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Check, X, Eye, User, Phone, AlertCircle, Clock,
  ShieldCheck, ShieldAlert, Users, UserX,
} from 'lucide-react';
import { AdminDriver, DriverKycStatus } from '../api';
import { useAllDrivers, useApproveDriver, useRejectDriver } from '../hooks/useAdminDrivers';
import { DriverKycDrawer } from './DriverKycDrawer';
import { RejectDriverModal } from './RejectDriverModal';
import { formatIST } from '@/lib/utils/formatters';
import { isApiError } from '@/lib/api/errors';
import { TransitLoader } from '@/lib/brand';

type Filter = 'all' | 'pending' | 'verified' | 'failed';

const kycBadge = (status: DriverKycStatus) => {
  switch (status) {
    case 'VERIFIED':
    case 'ACTIVE': return <Badge tone="emerald">{status}</Badge>;
    case 'INVITED':
    case 'SIGNED_UP':
    case 'KYC_PENDING': return <Badge tone="amber">{status.replace('_', ' ')}</Badge>;
    case 'KYC_FAILED':
    case 'BLOCKED':
    case 'DEACTIVATED': return <Badge tone="red">{status.replace('_', ' ')}</Badge>;
    default: return <Badge tone="slate">{status}</Badge>;
  }
};

export function AdminDriversTab() {
  const { data: drivers, isLoading } = useAllDrivers();
  const approveMutation = useApproveDriver();
  const rejectMutation = useRejectDriver();

  const [filter, setFilter] = useState<Filter>('all');
  const [viewTarget, setViewTarget] = useState<AdminDriver | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminDriver | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  // Stats
  const stats = useMemo(() => {
    const all = drivers || [];
    return {
      total: all.length,
      pending: all.filter((d) => d.kycStatus === 'INVITED' || d.kycStatus === 'SIGNED_UP' || d.kycStatus === 'KYC_PENDING').length,
      verified: all.filter((d) => d.kycStatus === 'VERIFIED' || d.kycStatus === 'ACTIVE').length,
      failed: all.filter((d) => d.kycStatus === 'KYC_FAILED' || d.kycStatus === 'BLOCKED' || d.kycStatus === 'DEACTIVATED').length,
    };
  }, [drivers]);

  // Filter
  const filtered = useMemo(() => {
    if (!drivers) return [];
    switch (filter) {
      case 'pending':
        return drivers.filter((d) => d.kycStatus === 'INVITED' || d.kycStatus === 'SIGNED_UP' || d.kycStatus === 'KYC_PENDING');
      case 'verified':
        return drivers.filter((d) => d.kycStatus === 'VERIFIED' || d.kycStatus === 'ACTIVE');
      case 'failed':
        return drivers.filter((d) => d.kycStatus === 'KYC_FAILED' || d.kycStatus === 'BLOCKED' || d.kycStatus === 'DEACTIVATED');
      default:
        return drivers;
    }
  }, [drivers, filter]);

  const handleApprove = async (id: string) => {
    setError(null);
    try {
      await approveMutation.mutateAsync(id);
      setViewTarget(null);
    } catch (err) {
      if (isApiError(err)) setError({ message: err.message, code: err.code });
      else setError({ message: 'Failed to approve driver.' });
    }
  };

  const handleReject = (id: string) => {
    const driver = drivers?.find((d) => d.id === id) || viewTarget;
    if (driver) setRejectTarget(driver);
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    setError(null);
    try {
      await rejectMutation.mutateAsync({ id: rejectTarget.id, reason });
      setRejectTarget(null);
      setViewTarget(null);
    } catch (err) {
      if (isApiError(err)) setError({ message: err.message, code: err.code });
      else setError({ message: 'Failed to reject driver.' });
    }
  };

  const columns: ColumnDef<AdminDriver>[] = [
    {
      accessorKey: 'name',
      header: 'Driver',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand/10 rounded-md text-brand-text">
            <User size={16} />
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
      header: 'License',
      cell: ({ row }) => <span className="font-mono text-xs bg-surface-sunken px-2 py-1 rounded">{row.original.licenseNumber}</span>,
    },
    {
      accessorKey: 'operatorName',
      header: 'Operator',
      cell: ({ row }) => <span className="text-sm text-ink-secondary">{row.original.operatorName || '—'}</span>,
    },
    {
      accessorKey: 'kycStatus',
      header: 'KYC Status',
      cell: ({ row }) => kycBadge(row.original.kycStatus),
    },
    {
      accessorKey: 'createdAt',
      header: 'Added',
      cell: ({ row }) => <span className="text-xs text-ink-secondary">{formatIST(row.original.createdAt)}</span>,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const driver = row.original;
        const needsReview =
          driver.kycStatus === 'INVITED' ||
          driver.kycStatus === 'SIGNED_UP' ||
          driver.kycStatus === 'KYC_PENDING';

        if (needsReview) {
          return (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setViewTarget(driver)}>
                <Eye size={14} className="mr-1" /> View
              </Button>
              <Button size="sm" variant="secondary" className="text-brand-text hover:bg-brand/10" onClick={() => handleApprove(driver.id)} loading={approveMutation.isPending}>
                <Check size={14} className="mr-1" /> Approve
              </Button>
              <Button size="sm" variant="secondary" className="text-danger-crimson hover:bg-danger-crimson/10" onClick={() => handleReject(driver.id)}>
                <X size={14} className="mr-1" /> Reject
              </Button>
            </div>
          );
        }

        return (
          <Button size="sm" variant="ghost" onClick={() => setViewTarget(driver)}>
            <Eye size={14} className="mr-1" /> View
          </Button>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <TransitLoader size="md" caption="LOADING DRIVERS" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-danger-crimson/10 border border-danger-crimson/30 text-danger-crimson">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{error.message}</p>
              {error.code && <p className="text-xs font-mono opacity-80 mt-1">Code: {error.code}</p>}
            </div>
            <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-ink-muted mb-1">
            <Users size={14} /> TOTAL DRIVERS
          </div>
          <p className="text-2xl font-bold text-ink-bright">{stats.total}</p>
        </Card>
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 text-xs text-amber-600 mb-1">
            <ShieldAlert size={14} /> PENDING
          </div>
          <p className="text-2xl font-bold text-ink-bright">{stats.pending}</p>
        </Card>
        <Card className="p-4 border-brand/30 bg-brand/5">
          <div className="flex items-center gap-2 text-xs text-brand-text mb-1">
            <ShieldCheck size={14} /> VERIFIED
          </div>
          <p className="text-2xl font-bold text-ink-bright">{stats.verified}</p>
        </Card>
        <Card className="p-4 border-danger-crimson/30 bg-danger-crimson/5">
          <div className="flex items-center gap-2 text-xs text-danger-crimson mb-1">
            <UserX size={14} /> FAILED
          </div>
          <p className="text-2xl font-bold text-ink-bright">{stats.failed}</p>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-surface-sunken rounded-lg w-fit">
        {[
          { key: 'all' as Filter, label: 'All', count: stats.total },
          { key: 'pending' as Filter, label: 'Pending', count: stats.pending },
          { key: 'verified' as Filter, label: 'Verified', count: stats.verified },
          { key: 'failed' as Filter, label: 'Failed', count: stats.failed },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              filter === key ? 'bg-surface-card text-ink-bright shadow-sm' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filter === key ? 'bg-brand text-white' : 'bg-surface-card text-ink-muted'
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} isLoading={false} />

      <DriverKycDrawer
        driver={viewTarget}
        onClose={() => setViewTarget(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={approveMutation.isPending}
      />

      <RejectDriverModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
        driverName={rejectTarget?.name || ''}
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}