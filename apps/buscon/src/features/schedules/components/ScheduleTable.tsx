'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Schedule } from '../api';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { usePublishSchedule } from '../hooks/useSchedules';
import { useRoutes } from '@/features/routes/hooks/useRoutes';
import { ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { formatIST, formatINR } from '@/lib/utils/formatters';
import { isApiError } from '@/lib/api/errors';

export function ScheduleTable({ data, isLoading }: { data?: Schedule[]; isLoading: boolean }) {
  const publishMutation = usePublishSchedule();
  const { data: routes } = useRoutes();
  const [error, setError] = useState<string | null>(null);

  const routeApprovalMap = new Map<string, string>();
  (routes || []).forEach((r) => routeApprovalMap.set(r.id, r.approvalStatus));

  const handlePublish = async (id: string) => {
    setError(null);
    try {
      await publishMutation.mutateAsync(id);
    } catch (err) {
      if (isApiError(err) && err.code === 'SCHEDULE_CONFLICT') {
        const details = (err as any).details as any;
        setError(`Conflict! Bus is already scheduled from ${formatIST(details.departureTime)} to ${formatIST(details.arrivalTime)}.`);
      } else if (isApiError(err) && (err.code === 'ROUTE_NOT_APPROVED' || /route.*approv/i.test(err.message))) {
        setError('This route has not been approved by admin yet. Ask your admin to approve the route in Approvals → Routes.');
      } else {
        setError(isApiError(err) ? err.message : 'Failed to publish.');
      }
    }
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
            <span className="text-ink-bright">
              {row.original.route?.originCity?.name || 'Origin'}
            </span>
            <ArrowRight size={14} className="text-ink-muted" />
            <span className="text-ink-bright">
              {row.original.route?.destinationCity?.name || 'Dest'}
            </span>
            {!isApproved && routeStatus && (
              <Badge tone="amber">Route {routeStatus}</Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'bus',
      header: 'Bus',
      cell: ({ row }) => (
        <div className="text-sm">
          <span className="font-mono bg-surface-sunken px-1.5 py-0.5 rounded border border-line-hairline">
            {row.original.bus?.registrationNumber}
          </span>
        </div>
      ),
    },
    {
      id: 'time',
      header: 'Departure',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-ink-secondary text-sm">
          <Clock size={14} />
          {formatIST(row.original.departureTime)}
        </div>
      ),
    },
    {
      accessorKey: 'fareAmountPaise',
      header: 'Fare',
      cell: ({ row }) => <span className="font-mono text-ink-bright">{formatINR(row.original.fareAmountPaise)}</span>,
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
      cell: ({ row }) => {
        if (row.original.status !== 'DRAFT') return null;
        const routeStatus = routeApprovalMap.get(row.original.routeId);
        const routeApproved = routeStatus === 'APPROVED';
        return (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handlePublish(row.original.id)}
            loading={publishMutation.isPending}
            disabled={!routeApproved}
            title={!routeApproved ? 'Route must be approved by admin first' : 'Publish this schedule'}
          >
            Publish
          </Button>
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
        </div>
      )}
      <DataTable columns={columns} data={data || []} isLoading={isLoading} />
    </div>
  );
}