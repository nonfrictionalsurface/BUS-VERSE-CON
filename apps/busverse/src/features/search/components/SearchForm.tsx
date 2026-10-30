'use client';

import React from 'react';
import { CityAutocomplete } from './CityAutocomplete';
import { SearchFilters, City } from '../types';
import { ArrowLeftRight, Calendar, Search } from 'lucide-react';

interface SearchFormProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  isSearching: boolean;
}

export function SearchForm({
  filters,
  onChange,
  onSearch,
  isSearching,
}: SearchFormProps) {
  const swapCities = () => {
    onChange({
      ...filters,
      originCity: filters.destinationCity,
      destinationCity: filters.originCity,
    });
  };

  const handleOriginChange = (city: City | null) => {
    onChange({ ...filters, originCity: city });
  };

  const handleDestinationChange = (city: City | null) => {
    onChange({ ...filters, destinationCity: city });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, date: e.target.value });
  };

  const isValid = !!filters.originCity && !!filters.destinationCity && !!filters.date;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid && !isSearching) onSearch();
      }}
      className="p-5 md:p-6 rounded-2xl bg-surface-card border border-border-subtle shadow-ambient"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-end">
        <div className="md:col-span-4">
          <CityAutocomplete
            label="Departure Station"
            placeholder="From (e.g. Kanpur)"
            value={filters.originCity}
            onChange={handleOriginChange}
            excludeCityId={filters.destinationCity?.id}
          />
        </div>

        <div className="hidden md:flex md:col-span-1 justify-center pb-2">
          <button
            type="button"
            onClick={swapCities}
            aria-label="Swap departure and arrival stations"
            className="p-2.5 rounded-xl border border-border-strong bg-canvas-subtle hover:bg-surface-hover text-ink-secondary hover:text-brand-primary transition-all shadow-sm"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        <div className="md:col-span-4">
          <CityAutocomplete
            label="Arrival Station"
            placeholder="To (e.g. Lucknow)"
            value={filters.destinationCity}
            onChange={handleDestinationChange}
            excludeCityId={filters.originCity?.id}
          />
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink-muted mb-1.5">
            Journey Date
          </label>
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 w-4 h-4 text-brand-primary pointer-events-none" />
            <input
              type="date"
              value={filters.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={handleDateChange}
              className="w-full pl-9 pr-3 py-2.5 text-sm font-semibold rounded-xl bg-surface-card border border-border-strong text-ink-bright focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-subtle transition-all"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border-hairline">
        <button
          type="button"
          onClick={swapCities}
          className="md:hidden flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-brand-primary py-1"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Swap Stations</span>
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto ml-auto">
          <button
            type="submit"
            disabled={!isValid || isSearching}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-brand-primary text-white hover:bg-brand-hover shadow-glow disabled:opacity-50 transition-all cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>{isSearching ? 'Finding Coaches...' : 'Find Schedules'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}