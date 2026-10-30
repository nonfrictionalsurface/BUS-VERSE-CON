'use client';

import React from 'react';
import Link from 'next/link';
import { ScheduleSearchResult, BusType } from '../types';
import { formatINR, formatISTTime, formatDuration } from '@/lib/utils/formatters';
import { Bus, Users, ArrowRight, ShieldCheck } from 'lucide-react';

interface ScheduleCardProps {
  schedule: ScheduleSearchResult;
}

const BUS_TYPE_LABELS: Record<BusType, { label: string; badge: string }> = {
  SEATER: { label: 'Standard Seater', badge: 'bg-surface-sunken text-ink-secondary' },
  AC_SEATER: { label: 'AC Executive Seater', badge: 'bg-brand-subtle text-brand-primary border-brand-border' },
  SLEEPER: { label: 'Classic Sleeper', badge: 'bg-surface-sunken text-ink-primary' },
  AC_SLEEPER: { label: 'Luxury AC Sleeper', badge: 'bg-telemetry-subtle text-telemetry-cyan border-telemetry-subtle' },
  SEMI_SLEEPER: { label: 'Semi-Sleeper Coach', badge: 'bg-signal-subtle text-signal-emerald' },
};

export function ScheduleCard({ schedule }: ScheduleCardProps) {
  const farePaise = typeof schedule.fare === 'object' ? schedule.fare.amountPaise : schedule.fare;
  const busConfig = BUS_TYPE_LABELS[schedule.busType] || {
    label: schedule.busType,
    badge: 'bg-surface-sunken text-ink-primary',
  };

  const isLowSeats = schedule.availableSeats > 0 && schedule.availableSeats <= 5;
  const isSoldOut = schedule.availableSeats === 0;

  return (
    <div className="p-5 rounded-2xl bg-surface-card border border-border-hairline shadow-ambient hover:border-border-focus transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-ink-bright tracking-tight">
              {schedule.operatorName}
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider font-semibold bg-surface-sunken">
              <ShieldCheck className="w-3 h-3 text-signal-emerald" />
              Verified Operator
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${busConfig.badge}`}>
              {busConfig.label}
            </span>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-2xl font-extrabold text-ink-bright">
            {formatINR(farePaise)}
          </div>
          <span className="text-[11px] text-ink-muted">per seat (tax included)</span>
        </div>
      </div>

      <div className="grid grid-cols-3 items-center py-5">
        <div>
          <div className="text-xl font-extrabold text-ink-bright">
            {formatISTTime(schedule.departureTime)}
          </div>
          <span className="text-xs font-medium text-ink-secondary">Origin Stand</span>
        </div>

        <div className="flex flex-col items-center justify-center px-2">
          <span className="text-[11px] font-mono font-semibold text-ink-muted mb-1">
            {formatDuration(schedule.durationMinutes)}
          </span>
          <div className="w-full flex items-center gap-1">
            <div className="h-0.5 flex-1 bg-border-strong rounded-full" />
            <Bus className="w-3.5 h-3.5 text-brand-primary" />
            <div className="h-0.5 flex-1 bg-border-strong rounded-full" />
          </div>
          <span className="text-[10px] text-signal-emerald font-semibold mt-1">Non-stop Route</span>
        </div>

        <div className="text-right">
          <div className="text-xl font-extrabold text-ink-bright">
            {formatISTTime(schedule.arrivalTime)}
          </div>
          <span className="text-xs font-medium text-ink-secondary">Dest Stand</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border-hairline">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-ink-muted" />
          {isSoldOut ? (
            <span className="text-xs font-bold text-danger-crimson">Coach Fully Booked</span>
          ) : isLowSeats ? (
            <span className="text-xs font-bold text-warning-amber animate-pulse">
              Only {schedule.availableSeats} seats remaining!
            </span>
          ) : (
            <span className="text-xs font-semibold text-signal-emerald">
              {schedule.availableSeats} seats available
            </span>
          )}
        </div>

        <Link
          href={`/schedule/${schedule.scheduleId}`}
          className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
            isSoldOut
              ? 'bg-surface-sunken text-ink-muted cursor-not-allowed pointer-events-none'
              : 'bg-brand-primary text-white hover:bg-brand-hover shadow-glow'
          }`}
        >
          <span>Select Seats</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}