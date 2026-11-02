'use client';

import { useState, useMemo } from 'react';
import {
  usePendingOperators, usePendingBuses, usePendingRoutes,
  useApproveOperator, useRejectOperator,
  useApproveBus, useRejectBus,
  useApproveRoute,
} from '../hooks/useApprovals';
import { useAllDrivers } from '@/features/admin-drivers/hooks/useAdminDrivers';
import { AdminDriversTab } from '@/features/admin-drivers/components/AdminDriversTab';
import { DataTable } from '@/components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/Button';
import { Check, X, ShieldAlert, Bus, Map as MapIcon, AlertCircle, Eye, ArrowRight, User } from 'lucide-react';
import { PendingOperator, PendingBus, PendingRoute } from '../api';
import { formatIST } from '@/lib/utils/formatters';
import { isApiError } from '@/lib/api/errors';
import { RejectModal } from './RejectModal';
import { OperatorApplicationDrawer } from './OperatorApplicationDrawer';

type Tab = 'operators' | 'buses' | 'routes' | 'drivers';

export function ApprovalsTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('operators');
  const [rejectTarget, setRejectTarget] = useState<{ id: string, type: 'operator' | 'bus' } | null>(null);
  const [viewTarget, setViewTarget] = useState<PendingOperator | null>(null);
  const [error, setError] = useState<{ message: string; code?: string; details?: any } | null>(null);

  const { data: operators, isLoading: loadingOps } = usePendingOperators();
  const { data: buses, isLoading: loadingBuses } = usePendingBuses();
  const { data: routes, isLoading: loadingRoutes } = usePendingRoutes();
  const { data: allDrivers } = useAllDrivers();

  const approveOp = useApproveOperator();
  const rejectOp = useRejectOperator();
  const approveBus = useApproveBus();
  const rejectBus = useRejectBus();
  const approveRoute = useApproveRoute();

  // Pending driver count = drivers awaiting KYC review
  const pendingDriverCount = useMemo(() => {
    return (allDrivers || []).filter(
      (d) => d.kycStatus === 'INVITED' || d.kycStatus === 'SIGNED_UP' || d.kycStatus === 'KYC_PENDING'
    ).length;
  }, [allDrivers]);

  const showError = (err: unknown, fallback: string) => {
    if (isApiError(err)) setError({ message: err.message || fallback, code: err.code, details: (err as any).details });
    else setError({ message: (err as Error)?.message || fallback });
  };

  const handleApproveOp = async (id: string) => {
    setError(null);
    try { await approveOp.mutateAsync(id); setViewTarget(null); } catch (err) { showError(err, 'Failed to approve operator.'); }
  };
  const handleApproveBus = async (id: string) => {
    setError(null);
    try { await approveBus.mutateAsync(id); } catch (err) { showError(err, 'Failed to approve bus.'); }
  };
  const handleApproveRoute = async (id: string) => {
    setError(null);
    try { await approveRoute.mutateAsync(id); } catch (err) { showError(err, 'Failed to approve route.'); }
  };
  const handleConfirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    setError(null);
    try {
      if (rejectTarget.type === 'operator') await rejectOp.mutateAsync({ id: rejectTarget.id, reason });
      else await rejectBus.mutateAsync({ id: rejectTarget.id, reason });
      setRejectTarget(null);
      setViewTarget(null);
    } catch (err) { showError(err, 'Failed to reject.'); }
  };

  const operatorCols: ColumnDef<PendingOperator>[] = [
    { accessorKey: 'companyName', header: 'Company', cell: ({ row }) => <span className="font-bold text-ink-bright">{row.original.companyName}</span> },
    { accessorKey: 'gstin', header: 'GSTIN', cell: ({ row }) => <span className="font-mono text-sm bg-surface-sunken px-2 py-1 rounded">{row.original.gstin}</span> },
    {
      accessorKey: 'email', header: 'Contact', cell: ({ row }) => (
        <div className="flex flex-col text-xs">
          <span className="text-ink-primary">{row.original.email}</span>
          <span className="text-ink-secondary">{row.original.phone}</span>
        </div>
      )
    },
    { accessorKey: 'createdAt', header: 'Applied', cell: ({ row }) => <span className="text-sm text-ink-secondary">{formatIST(row.original.createdAt)}</span> },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setViewTarget(row.original)}>
            <Eye size={14} className="mr-1" /> View
          </Button>
          <Button size="sm" variant="secondary" className="text-brand-text hover:bg-brand/10" onClick={() => handleApproveOp(row.original.id)} loading={approveOp.isPending}>
            <Check size={14} className="mr-1" /> Approve
          </Button>
          <Button size="sm" variant="secondary" className="text-danger-crimson hover:bg-red-50" onClick={() => setRejectTarget({ id: row.original.id, type: 'operator' })}>
            <X size={14} className="mr-1" /> Reject
          </Button>
        </div>
      )
    }
  ];

  const busCols: ColumnDef<PendingBus>[] = [
    { accessorKey: 'registrationNumber', header: 'Registration', cell: ({ row }) => <span className="font-mono font-bold text-ink-bright">{row.original.registrationNumber}</span> },
    { accessorKey: 'model', header: 'Model', cell: ({ row }) => <span className="text-sm text-ink-secondary">{row.original.model}</span> },
    { accessorKey: 'operatorName', header: 'Operator', cell: ({ row }) => <span className="text-sm font-medium">{row.original.operatorName || '—'}</span> },
    { accessorKey: 'createdAt', header: 'Submitted', cell: ({ row }) => <span className="text-sm">{formatIST(row.original.createdAt)}</span> },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="text-brand-text hover:bg-brand/10" onClick={() => handleApproveBus(row.original.id)} loading={approveBus.isPending}>
            <Check size={14} className="mr-1" /> Approve
          </Button>
          <Button size="sm" variant="secondary" className="text-danger-crimson hover:bg-red-50" onClick={() => setRejectTarget({ id: row.original.id, type: 'bus' })}>
            <X size={14} className="mr-1" /> Reject
          </Button>
        </div>
      )
    }
  ];

  const routeCols: ColumnDef<PendingRoute>[] = [
    { id: 'origin', header: 'Origin', cell: ({ row }) => <span className="font-bold text-ink-bright">{row.original.originCity?.name || '—'}</span> },
    { id: 'arrow', header: '', cell: () => <ArrowRight size={16} className="text-ink-muted" /> },
    { id: 'destination', header: 'Destination', cell: ({ row }) => <span className="font-bold text-ink-bright">{row.original.destinationCity?.name || '—'}</span> },
    { accessorKey: 'createdAt', header: 'Submitted', cell: ({ row }) => <span className="text-sm text-ink-secondary">{formatIST(row.original.createdAt)}</span> },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button size="sm" variant="secondary" className="text-brand-text hover:bg-brand/10" onClick={() => handleApproveRoute(row.original.id)} loading={approveRoute.isPending}>
          <Check size={14} className="mr-1" /> Approve Route
        </Button>
      )
    }
  ];

  const tabs: Array<{ key: Tab; label: string; icon: any; count?: number }> = [
    { key: 'operators', label: 'Operators', icon: ShieldAlert, count: operators?.length },
    { key: 'buses', label: 'Buses', icon: Bus, count: buses?.length },
    { key: 'routes', label: 'Routes', icon: MapIcon, count: routes?.length },
    { key: 'drivers', label: 'Drivers', icon: User, count: pendingDriverCount },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 bg-surface-sunken rounded-lg w-fit flex-wrap">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              activeTab === key ? 'bg-surface-card text-ink-bright shadow-sm' : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            <Icon size={16} /> {label}
            {count != null && count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">{count}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-danger-crimson/10 border border-danger-crimson/30 text-danger-crimson">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1 min-w-0">
              <p className="font-semibold">{error.message}</p>
              {error.code && <p className="text-xs font-mono opacity-80">Code: {error.code}</p>}
              {error.details && (
                <pre className="text-xs font-mono bg-black/10 p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap mt-2">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              )}
            </div>
            <button onClick={() => setError(null)} className="ml-auto opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'operators' && <DataTable columns={operatorCols} data={operators || []} isLoading={loadingOps} />}
      {activeTab === 'buses' && <DataTable columns={busCols} data={buses || []} isLoading={loadingBuses} />}
      {activeTab === 'routes' && <DataTable columns={routeCols} data={routes || []} isLoading={loadingRoutes} />}
      {activeTab === 'drivers' && <AdminDriversTab />}

      <RejectModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
        title={`Reject ${rejectTarget?.type === 'operator' ? 'Operator' : 'Bus'}`}
        isLoading={rejectOp.isPending || rejectBus.isPending}
      />

      <OperatorApplicationDrawer
        operator={viewTarget}
        onClose={() => setViewTarget(null)}
        onApprove={handleApproveOp}
        onReject={(id) => setRejectTarget({ id, type: 'operator' })}
        isApproving={approveOp.isPending}
      />
    </div>
  );
}