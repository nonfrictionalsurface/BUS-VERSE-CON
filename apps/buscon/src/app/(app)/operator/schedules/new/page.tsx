'use client';

import { ScheduleForm } from '@/features/schedules/components/ScheduleForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewSchedulePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link href="/operator/schedules" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-text mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Schedules
        </Link>
        <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Create Schedule</h1>
        <p className="text-sm text-ink-secondary mt-1">A schedule appears in BusVerse search only after it is published.</p>
      </div>
      <ScheduleForm />
    </div>
  );
}