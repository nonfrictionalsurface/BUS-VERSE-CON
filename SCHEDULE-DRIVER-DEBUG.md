# Schedule/Driver Debug Dump
Generated: 2026-10-31 20:59:40

---
## FILE: apps\buscon\src\features\schedules\components\ScheduleTable.tsx

```
'use client';

import { useState, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Schedule } from '../api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { usePublishSchedule, useDeleteSchedule } from '../hooks/useSchedules';
import { useRoutes } from '@/features/routes/hooks/useRoutes';
import { useTrips, useUnassignTrip } from '@/features/trips/hooks/useTrips';
import { AssignDriverModal } from '@/features/trips/components/AssignDriverModal';
import { DeleteScheduleModal } from './DeleteScheduleModal';
import { Trip } from '@/features/trips/api';
import {
  ArrowRight, Clock, AlertCircle, UserPlus, RefreshCw, X, User, Phone, Trash2,
} from 'lucide-react';
import { formatIST, formatINR } from '@/lib/utils/formatters';
import { isApiError } from '@/lib/api/errors';

export function ScheduleTable({ data, isLoading }: { data?: Schedule[]; isLoading: boolean }) {
  const publishMutation = usePublishSchedule();
  const unassignMutation = useUnassignTrip();
  const deleteMutation = useDeleteSchedule();
  const { data: routes } = useRoutes();
  const { data: trips } = useTrips({ limit: 100 });
  const [error, setError] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<Schedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);

  const routeApprovalMap = useMemo(() => {
    const map = new Map<string, string>();
    (routes || []).forEach((r) => map.set(r.id, r.approvalStatus));
    return map;
  }, [routes]);

  const tripBySchedule = useMemo(() => {
    const map = new Map<string, Trip>();
    (trips || []).forEach((t) => map.set(t.scheduleId, t));
    return map;
  }, [trips]);

  const handlePublish = async (id: string) => {
    setError(null);
    try {
      await publishMutation.mutateAsync(id);
    } catch (err) {
      if (isApiError(err) && err.code === 'SCHEDULE_CONFLICT') {
        const details = (err as any).details as any;
        setError(`Conflict! Bus is already scheduled from ${formatIST(details.departureTime)} to ${formatIST(details.arrivalTime)}.`);
      } else if (isApiError(err) && (err.code === 'ROUTE_NOT_APPROVED' || /route.*approv/i.test(err.message))) {
        setError('This route has not been approved by admin yet.');
      } else {
        setError(isApiError(err) ? err.message : 'Failed to publish.');
      }
    }
  };

  const handleUnassign = async (tripId: string) => {
    if (!confirm('Unassign driver from this trip?')) return;
    setError(null);
    try {
      await unassignMutation.mutateAsync(tripId);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Failed to unassign driver.');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const columns: ColumnDef<Schedule>[] = [
    {
      id: 'route',
      header: 'Route',
      cell: ({ row }) => {
        const routeStatus = routeApprovalMap.get(row.original.routeId);
        const isApproved = routeStatus === 'APPROVED';
        return (
          <div className="flex items-center gap-2 font-medium">
            <span className="text-ink-bright">{row.original.route?.originCity?.name || 'Origin'}</span>
            <ArrowRight size={14} className="text-ink-muted" />
            <span className="text-ink-bright">{row.original.route?.destinationCity?.name || 'Dest'}</span>
            {!isApproved && routeStatus && <Badge tone="amber">Route {routeStatus}</Badge>}
          </div>
        );
      },
    },
    {
      id: 'bus',
      header: 'Bus',
      cell: ({ row }) => (
        <span className="font-mono text-sm bg-surface-sunken px-1.5 py-0.5 rounded border border-line-hairline">
          {row.original.bus?.registrationNumber}
        </span>
      ),
    },
    {
      id: 'time',
      header: 'Departure',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-ink-secondary text-sm">
          <Clock size={14} /> {formatIST(row.original.departureTime)}
        </div>
      ),
    },
    {
      accessorKey: 'fareAmountPaise',
      header: 'Fare',
      cell: ({ row }) => {
        const s = row.original as any;
        const val = s.fareAmountPaise ?? s.fareAmount ?? s.fare ?? s.fareAmountRupees;
        return <span className="font-mono text-ink-bright">{formatINR(val)}</span>;
      },
    },
    {
      id: 'driver',
      header: 'Driver',
      cell: ({ row }) => {
        const trip = tripBySchedule.get(row.original.id);
        if (!trip) return <Badge tone="amber">Unassigned</Badge>;
        return (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-brand/10 text-brand-text">
              <User size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-bright truncate">{trip.driverName}</p>
              <p className="text-[10px] text-ink-muted flex items-center gap-0.5">
                <Phone size={9} /> {trip.driverPhone}
              </p>
            </div>
            {trip.status === 'IN_PROGRESS' && <Badge tone="emerald">Live</Badge>}
            {trip.status === 'SCHEDULED' && <Badge tone="slate">Scheduled</Badge>}
            {trip.status === 'COMPLETED' && <Badge tone="slate">Done</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        return <Badge tone={s === 'PUBLISHED' ? 'emerald' : s === 'CANCELLED' ? 'red' : 'slate'}>{s}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const schedule = row.original;
        const trip = tripBySchedule.get(schedule.id);
        const isPast = new Date(schedule.departureTime) < new Date();
        const canDelete = schedule.status !== 'CANCELLED' && (!trip || trip.status === 'SCHEDULED');
        const routeApproved = routeApprovalMap.get(schedule.routeId) === 'APPROVED';

        return (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Publish */}
            {schedule.status === 'DRAFT' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handlePublish(schedule.id)}
                loading={publishMutation.isPending}
                disabled={!routeApproved}
                title={!routeApproved ? 'Route must be approved first' : 'Publish this schedule'}
              >
                Publish
              </Button>
            )}

            {/* Assign */}
            {schedule.status === 'PUBLISHED' && !trip && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAssignTarget(schedule)}
                className="text-brand-text hover:bg-brand/10"
              >
                <UserPlus size={14} className="mr-1" /> Assign
              </Button>
            )}

            {/* Reassign + Unassign */}
            {trip?.status === 'SCHEDULED' && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAssignTarget(schedule)}
                >
                  <RefreshCw size={14} className="mr-1" /> Reassign
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUnassign(trip.tripId)}
                  loading={unassignMutation.isPending}
                  className="text-danger-crimson hover:bg-danger-crimson/10"
                  title="Unassign driver"
                >
                  <X size={14} />
                </Button>
              </>
            )}

            {/* Live indicator */}
            {trip?.status === 'IN_PROGRESS' && (
              <span className="text-xs text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            )}

            {/* Delete â€” visible red, compact */}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteTarget(schedule)}
                className="text-danger-crimson hover:bg-danger-crimson/15 border border-danger-crimson/40"
                title="Delete this schedule"
              >
                <Trash2 size={14} className="mr-1" /> Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-danger-crimson/10 text-danger-crimson text-sm font-medium border border-danger-crimson/20 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      <DataTable columns={columns} data={data || []} isLoading={isLoading} />
      <AssignDriverModal
        isOpen={!!assignTarget}
        schedule={assignTarget}
        currentTrip={assignTarget ? tripBySchedule.get(assignTarget.id) || null : null}
        onClose={() => setAssignTarget(null)}
        onSuccess={() => setAssignTarget(null)}
      />
      <DeleteScheduleModal
        isOpen={!!deleteTarget}
        schedule={deleteTarget}
        hasTrip={deleteTarget ? !!tripBySchedule.get(deleteTarget.id) : false}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
```

---
## FILE: apps\buscon\src\lib\utils\formatters.ts

```
export function formatINR(paise?: number | bigint | string | null): string {
  if (paise === undefined || paise === null || paise === '') return '—';
  const num = typeof paise === 'string' ? parseFloat(paise) : Number(paise);
  if (Number.isNaN(num) || num <= 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(num / 100);
}
export function formatIST(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
```

---
## FILE: apps\buscon\src\features\schedules\api\index.ts

```
import { api } from '@/lib/api/client';

export interface Schedule {
  id: string;
  busId: string;
  routeId: string;
  departureTime: string;
  arrivalTime: string;
  fareAmountPaise: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  bus: { registrationNumber: string; model: string };
  route: { originCity: { name: string }; destinationCity: { name: string } };
}

export interface CreateScheduleInput {
  busId: string;
  routeId: string;
  departureTime: string;
  arrivalTime: string;
  fareAmountPaise: number;
}

export const schedulesApi = {
  list: async (): Promise<Schedule[]> => {
    const res = await api.get<Schedule[]>('/operator/schedules');
    return res.data;
  },
  create: async (data: CreateScheduleInput): Promise<Schedule> => {
    const res = await api.post<Schedule>('/operator/schedules', data);
    return res.data;
  },
  publish: async (id: string): Promise<void> => {
    await api.post(`/operator/schedules/${id}/publish`, {});
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/dev/delete-schedule/${id}`);
  },
};
```

---
## FILE: apps\buscon\src\features\drivers\api\index.ts

```
import { api } from '@/lib/api/client';

export type KycStatus = 'INVITED' | 'SIGNED_UP' | 'KYC_PENDING' | 'VERIFIED' | 'KYC_FAILED' | 'ACTIVE' | 'BLOCKED' | 'DEACTIVATED';

export interface Driver {
  id: string;
  userId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  kycStatus: KycStatus;
  onDuty: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface InviteDriverInput {
  name: string;
  phone: string;
  licenseNumber: string;
}

export const driversApi = {
  list: async (): Promise<Driver[]> => {
    const res = await api.get<Driver[]>('/operator/drivers?limit=50');
    return res.data;
  },
  invite: async (data: InviteDriverInput): Promise<Driver> => {
    const res = await api.post<Driver>('/operator/drivers/invite', data);
    return res.data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/operator/drivers/${id}`);
  },
  // Dev-only: verify a driver
  verify: async (id: string): Promise<void> => {
    await api.post(`/dev/verify-driver/${id}`, {});
  }
};
```
