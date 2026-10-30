'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useSchedules } from '@/features/schedules/hooks/useSchedules';
import { ScheduleTable } from '@/features/schedules/components/ScheduleTable';
import { Button } from '@/components/ui/Button';

export default function SchedulesPage() {
  const { data, isLoading } = useSchedules();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Schedules</h1>
          <p className="text-sm text-ink-secondary mt-1">Assign buses to routes and publish them to passengers.</p>
        </div>
        <Link href="/operator/schedules/new">
          <Button>
            <Plus size={16} /> Add Schedule
          </Button>
        </Link>
      </div>

      <ScheduleTable data={data} isLoading={isLoading} />
    </div>
  );
}