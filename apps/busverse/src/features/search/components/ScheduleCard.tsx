'use client';

import React from 'react';
import Link from 'next/link';
import { ScheduleSearchResult } from '../api/search.api';
import { formatINR, formatISTTime } from '@/lib/utils/formatters';
import { Bus, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

export const ScheduleCard: React.FC<{ schedule: ScheduleSearchResult }> = ({ schedule }) => {
  return (
    <div className="group rounded-2xl border border-border-subtle bg-surface-card p-5 shadow-ambient hover:border-brand-primary/50 hover:shadow-floating transition-all">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-sans text-base font-bold text-ink-bright">{schedule.operatorName}</span>
            <span className="rounded-md bg-brand-primary-subtle px-2 py-0.5 text-[10px] font-bold text-brand-primary border border-brand-primary/20">
              {schedule.busType.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-secondary">
            <ShieldCheck className="h-3.5 w-3.5 text-signal-emerald" />
            <span>Verified Fleet Operator</span>
          </div>
        </div>

        {/* Timings */}
        <div className="flex items-center gap-6">
          <div className="text-left">
            <div className="font-mono text-base font-bold text-ink-bright">
              {formatISTTime(schedule.departureTime)}
            </div>
            <div className="text-[10px] text-ink-muted">Departure (IST)</div>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 font-mono text-[10px] text-ink-secondary">
              <Clock className="h-3 w-3" />
              <span>{Math.floor(schedule.durationMinutes / 60)}h {schedule.durationMinutes % 60}m</span>
            </div>
            <div className="w-16 h-0.5 bg-border-strong relative my-1">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-brand-primary" />
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-base font-bold text-ink-bright">
              {formatISTTime(schedule.arrivalTime)}
            </div>
            <div className="text-[10px] text-ink-muted">Arrival (IST)</div>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-border-hairline">
          <div>
            <div className="font-mono text-xl font-extrabold text-ink-bright">
              {formatINR(schedule.fare.amountPaise)}
            </div>
            <div className="text-[10px] font-semibold text-signal-emerald">
              {schedule.availableSeats} seats available
            </div>
          </div>

          <Link
            href={`/schedule/${schedule.scheduleId}`}
            className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover shadow-sm transition-colors"
          >
            <span>Select Seats</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
