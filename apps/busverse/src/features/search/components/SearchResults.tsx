'use client';

import React from 'react';
import { ScheduleSearchResult } from '../types';
import { ScheduleCard } from './ScheduleCard';
import { TransitLoader } from '@/components/brand/TransitLoader';
import { Bus, ArrowUpDown } from 'lucide-react';

interface SearchResultsProps {
  schedules: ScheduleSearchResult[];
  isLoading: boolean;
  hasSearched: boolean;
  sortBy: 'departureTime' | 'fare';
  onSortChange: (sortBy: 'departureTime' | 'fare') => void;
}

export function SearchResults({
  schedules,
  isLoading,
  hasSearched,
  sortBy,
  onSortChange,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center rounded-2xl bg-surface-card border border-border-hairline shadow-ambient">
        <TransitLoader size="sm" caption="LOCATING SCHEDULES" />
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="p-12 text-center rounded-2xl bg-canvas-subtle border border-border-hairline">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-subtle text-brand-primary flex items-center justify-center mb-3">
          <Bus className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-ink-bright">Ready to Travel?</h3>
        <p className="text-xs text-ink-secondary mt-1 max-w-sm mx-auto">
          Choose your departure station, arrival destination, and preferred date to discover verified intercity schedules.
        </p>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-surface-card border border-border-hairline shadow-ambient">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-warning-subtle text-warning-amber flex items-center justify-center mb-3">
          <Bus className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-ink-bright">No Coaches Scheduled</h3>
        <p className="text-xs text-ink-secondary mt-1 max-w-md mx-auto">
          No published schedules matched this exact route and date. Try selecting another date or searching for neighboring major hubs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="text-xs font-semibold text-ink-secondary">
          Found <span className="font-bold text-ink-bright">{schedules.length}</span> available coaches
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted font-medium flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort by:
          </span>
          <div className="inline-flex rounded-xl bg-surface-card border border-border-strong p-0.5">
            <button
              type="button"
              onClick={() => onSortChange('departureTime')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                sortBy === 'departureTime'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Departure
            </button>
            <button
              type="button"
              onClick={() => onSortChange('fare')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                sortBy === 'fare'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Price
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {schedules.map((schedule) => (
          <ScheduleCard key={schedule.scheduleId} schedule={schedule} />
        ))}
      </div>
    </div>
  );
}