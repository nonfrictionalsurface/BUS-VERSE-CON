'use client';

import { useRouter } from 'next/navigation';
import { ScheduleResult } from '@/lib/api/search.api';
import { useAuth } from '@/lib/auth/AuthContext';
import { formatINR, formatISTTime, formatDuration } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/Button';

interface ScheduleCardProps {
  schedule: ScheduleResult;
}

export function ScheduleCard({ schedule }: ScheduleCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const handleSelect = () => {
    const target = `/booking/${schedule.scheduleId}`;
    if (!isAuthenticated) {
      router.push(`/login?returnTo=${encodeURIComponent(target)}`);
    } else {
      router.push(target);
    }
  };

  return (
    <div className="bg-surface border border-border-hairline rounded-lg p-5 hover:border-border-subtle transition-colors shadow-ambient">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-text-bright">{schedule.operatorName}</p>
          {schedule.busType && (
            <span className="inline-block mt-1 text-xs font-medium text-text-muted px-2 py-0.5 rounded bg-surface-hover border border-border-hairline">
              {schedule.busType}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-bright font-mono">
            {formatINR(schedule.farePaise)}
          </p>
          {typeof schedule.availableSeats === 'number' && (
            <p className="text-xs text-text-muted">
              {schedule.availableSeats} {schedule.availableSeats === 1 ? 'seat' : 'seats'} left
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="text-left">
          <p className="text-xl font-bold text-text-bright font-mono">
            {formatISTTime(schedule.departureTime)}
          </p>
          <p className="text-xs text-text-muted">{schedule.originCityName}</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-xs text-text-muted">{formatDuration(schedule.durationMinutes)}</p>
          <div className="h-px bg-border-subtle my-1" />
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-text-bright font-mono">
            {formatISTTime(schedule.arrivalTime)}
          </p>
          <p className="text-xs text-text-muted">{schedule.destinationCityName}</p>
        </div>
      </div>

      <Button onClick={handleSelect} fullWidth variant="primary">
        Select
      </Button>
    </div>
  );
}