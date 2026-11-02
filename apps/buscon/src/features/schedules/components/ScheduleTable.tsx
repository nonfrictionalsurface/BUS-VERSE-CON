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
  ArrowRight, Clock, AlertCircle, UserPlus, RefreshCw, X, User, Trash2, Eye,
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
        setError(`Conflict! Bus already scheduled from ${formatIST(details.departureTime)} to ${formatIST(details.arrivalTime)}.`);
      } else if (isApiError(err) && (err.code === 'ROUTE_NOT_APPROVED' || /route.*approv/i.test(err.message))) {
        setError('Route must be approved by admin before publishing.');
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
    setError(null);
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteTarget(null);

      // Verify the row didn't come back after refetch
      setTimeout(() => {
        const current = (data || []);
        const stillThere = current.some((s) => s.id === id);
        if (stillThere) {
          setError(
            'Delete was accepted by the backend, but the schedule is still appearing in the list. ' +
            'This is a backend filtering issue — the schedule was soft-deleted but the list endpoint is not hiding it. ' +
            'Contact backend support or check the API logs.'
          );
        }
      }, 800);
    } catch (err: any) {
      if (isApiError(err)) {
        setError('[' + err.code + '] ' + err.message);
      } else {
        setError((err?.message || 'Failed to delete schedule.') + ' — check the browser console for details.');
      }
    }
  };

  const columns: ColumnDef<Schedule>[] = [
    {
      id: 'trip',
      header: 'Trip',
      cell: ({ row }) => {
        const s = row.original;
        const origin = s.route?.originCity?.name || 'Origin';
        const dest = s.route?.destinationCity?.name || 'Dest';
        const routeStatus = routeApprovalMap.get(s.routeId);
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-medium text-ink-bright text-sm whitespace-nowrap">
              <span className="truncate max-w-[110px]">{origin}</span>
              <ArrowRight size={12} className="text-ink-muted shrink-0" />
              <span className="truncate max-w-[110px]">{dest}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs text-ink-secondary bg-surface-sunken px-1.5 py-0.5 rounded border border-line-hairline">
                {s.bus?.registrationNumber}
              </span>
              {routeStatus && routeStatus !== 'APPROVED' && (
                <Badge tone="amber">Route {routeStatus}</Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'schedule',
      header: 'Schedule',
      cell: ({ row }) => {
        const s = row.original as any;
        const fare = s.fareAmountPaise ?? s.fareAmount ?? s.fare?.amountPaise ?? s.fareAmountRupees;
        return (
          <div className="whitespace-nowrap">
            <div className="flex items-center gap-1 text-sm text-ink-secondary">
              <Clock size={12} />
              {formatIST(s.departureTime)}
            </div>
            <div className="text-sm font-mono font-medium text-ink-bright mt-1">
              {formatINR(fare)}
            </div>
          </div>
        );
      },
    },
    {
      id: 'driver',
      header: 'Driver',
      cell: ({ row }) => {
        const trip = tripBySchedule.get(row.original.id);
        if (!trip) return <Badge tone="amber">Unassigned</Badge>;
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <div className="p-1 rounded-md bg-brand/10 text-brand-text shrink-0">
              <User size={12} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-ink-bright truncate max-w-[100px]">{trip.driverName}</div>
              <div className="text-[10px] text-ink-muted mt-0.5">
                {trip.status === 'IN_PROGRESS' ? <span className="text-emerald-500 font-semibold">● Live</span>
                  : trip.status === 'SCHEDULED' ? <span className="text-ink-muted">Scheduled</span>
                  : trip.status === 'COMPLETED' ? <span className="text-ink-muted">Done</span> : null}
              </div>
            </div>
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
        const canDelete = schedule.status !== 'CANCELLED' && (!trip || trip.status === 'SCHEDULED');
        const routeApproved = routeApprovalMap.get(schedule.routeId) === 'APPROVED';

        return (
          <div className="flex items-center gap-2">
            {schedule.status === 'DRAFT' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handlePublish(schedule.id)}
                loading={publishMutation.isPending}
                disabled={!routeApproved}
                title={!routeApproved ? 'Route must be approved first' : 'Publish'}
              >
                <Eye size={13} className="mr-1" /> Publish
              </Button>
            )}

            {schedule.status === 'PUBLISHED' && !trip && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setAssignTarget(schedule)}
                className="text-brand-text border-brand/30 hover:bg-brand/10"
                title="Assign driver"
              >
                <UserPlus size={14} className="mr-1" /> Assign
              </Button>
            )}

            {trip?.status === 'SCHEDULED' && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setAssignTarget(schedule)}
                  title="Reassign driver"
                >
                  <RefreshCw size={14} className="mr-1" /> Reassign
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUnassign(trip.tripId)}
                  loading={unassignMutation.isPending}
                  className="text-amber-600 hover:bg-amber-500/10"
                  title="Unassign driver"
                >
                  <X size={14} />
                </Button>
              </>
            )}

            {trip?.status === 'IN_PROGRESS' && (
              <span className="px-2 text-xs text-emerald-500 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-emerald animate-pulse" /> Live
              </span>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => setDeleteTarget(schedule)}
                title="Delete schedule"
                className="inline-flex items-center gap-1 px-3 h-8 rounded-md text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: '1px solid #B91C1C',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#B91C1C'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#DC2626'; }}
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-danger-crimson/10 text-danger-crimson text-sm font-medium border border-danger-crimson/30 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline hover:text-danger-crimson">dismiss</button>
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



