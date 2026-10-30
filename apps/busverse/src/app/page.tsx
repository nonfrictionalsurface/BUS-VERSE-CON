'use client';

import React, { useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { SearchForm } from '@/features/search/components/SearchForm';
import { SearchResults } from '@/features/search/components/SearchResults';
import { SearchFilters, ScheduleSearchResult } from '@/features/search/types';
import { searchSchedules } from '@/features/search/api/search.api';
import { Sparkles } from 'lucide-react';

export default function HomePage() {
  const [filters, setFilters] = useState<SearchFilters>({
    originCity: null,
    destinationCity: null,
    date: new Date().toISOString().split('T')[0],
    sortBy: 'departureTime',
  });

  const [schedules, setSchedules] = useState<ScheduleSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!filters.originCity || !filters.destinationCity || !filters.date) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const results = await searchSchedules({
        originCityId: filters.originCity.id,
        destinationCityId: filters.destinationCity.id,
        date: filters.date,
        sortBy: filters.sortBy,
      });
      setSchedules(results);
    } catch (err) {
      console.error('Failed to search schedules:', err);
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortChange = (newSort: 'departureTime' | 'fare') => {
    setFilters((prev) => ({ ...prev, sortBy: newSort }));
    setSchedules((prev) => {
      const copy = [...prev];
      if (newSort === 'fare') {
        return copy.sort((a, b) => {
          const fareA = typeof a.fare === 'object' ? a.fare.amountPaise : a.fare;
          const fareB = typeof b.fare === 'object' ? b.fare.amountPaise : b.fare;
          return fareA - fareB;
        });
      } else {
        return copy.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
      }
    });
  };

  return (
    <div className="min-h-screen bg-canvas pb-20">
      {/* Retains Profile Badge and View Tickets Vault navigation */}
      <AppHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 md:pt-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-subtle border border-brand-border text-brand-primary text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Transit Reservations</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-ink-bright tracking-tight leading-tight">
            Seamless Intercity Travel Across India
          </h1>
          <p className="text-sm text-ink-secondary mt-2">
            Real-time seat locks, authenticated Ed25519 boarding passes, and live GPS telemetry.
          </p>
        </div>

        <div className="mb-10">
          <SearchForm
            filters={filters}
            onChange={setFilters}
            onSearch={handleSearch}
            isSearching={isLoading}
          />
        </div>

        <div className="max-w-4xl mx-auto">
          <SearchResults
            schedules={schedules}
            isLoading={isLoading}
            hasSearched={hasSearched}
            sortBy={filters.sortBy}
            onSortChange={handleSortChange}
          />
        </div>
      </main>
    </div>
  );
}