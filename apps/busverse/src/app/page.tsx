'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { SearchForm } from '@/features/search/components/SearchForm';
import { ScheduleCard } from '@/features/search/components/ScheduleCard';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { searchApi, ScheduleSearchResult } from '@/features/search/api/search.api';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const searchParams = useSearchParams();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const fromCityId = searchParams.get('from');
  const toCityId = searchParams.get('to');
  const travelDate = searchParams.get('date');
  const fromName = searchParams.get('fromName');
  const toName = searchParams.get('toName');

  useEffect(() => {
    if (fromCityId && toCityId && travelDate) {
      setLoading(true);
      searchApi
        .searchSchedules(fromCityId, toCityId, travelDate)
        .then(setSchedules)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [fromCityId, toCityId, travelDate]);

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader onOpenAuth={() => setAuthModalOpen(true)} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary-subtle px-3 py-1 font-mono text-[10px] font-bold text-brand-primary">
            LIVE TRANSIT CORRIDOR
          </div>
          <h1 className="mt-3 font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-bright">
            Every intercity bus. One realtime platform.
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Verified operators across Delhi, Kanpur, and Lucknow with real-time seat locks and GPS tracking.
          </p>
        </div>

        <SearchForm />

        {/* Results Section */}
        {fromCityId && toCityId && (
          <div className="mt-8 space-y-4">
            <h2 className="font-sans text-lg font-bold text-ink-bright">
              Available Buses: {fromName} → {toName}
            </h2>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
              </div>
            ) : schedules.length > 0 ? (
              schedules.map((sch) => <ScheduleCard key={sch.scheduleId} schedule={sch} />)
            ) : (
              <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-xs text-ink-secondary">
                No published schedules available for this route on the selected date.
              </div>
            )}
          </div>
        )}
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
