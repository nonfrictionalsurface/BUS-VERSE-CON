'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api/search.api';
import { ScheduleCard } from '@/components/search/ScheduleCard';
import { Button } from '@/components/ui/Button';

function ResultsInner() {
  const params = useSearchParams();
  const from = params.get('from');
  const to = params.get('to');
  const date = params.get('date');
  const fromName = params.get('fromName') ?? 'Origin';
  const toName = params.get('toName') ?? 'Destination';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['search', { from, to, date }],
    queryFn: () => searchApi.search({
      originCityId: from!,
      destinationCityId: to!,
      date: date!,
    }),
    enabled: !!from && !!to && !!date,
    staleTime: 60_000,
  });

  if (!from || !to || !date) {
    return (
      <div className="max-w-md w-full mx-auto text-center">
        <p className="text-text-secondary mb-4">Missing search parameters.</p>
        <Link href="/search" className="text-brand hover:underline font-semibold">
          Start a new search
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto flex-1">
      <div className="mb-5">
        <Link href="/search" className="text-sm text-text-secondary hover:text-text-primary">
          ← Change search
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-text-bright tracking-tight">
          {fromName} → {toName}
        </h1>
        <p className="text-sm text-text-muted font-mono mt-1">{date}</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-surface border border-border-hairline rounded-lg p-5 animate-pulse">
              <div className="h-4 bg-surface-sunken rounded w-1/3 mb-3" />
              <div className="h-6 bg-surface-sunken rounded w-2/3 mb-3" />
              <div className="h-10 bg-surface-sunken rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-danger-crimson/10 border border-danger-crimson/30 rounded-lg p-4 text-center">
          <p className="text-danger-crimson text-sm mb-3">
            Couldn&apos;t load buses. Please try again.
          </p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && data && data.length === 0 && (
        <div className="text-center py-12">
          <p className="text-lg font-semibold text-text-bright mb-2">
            No buses on this date
          </p>
          <p className="text-sm text-text-secondary mb-6">
            Try a different date or route.
          </p>
          <Link href="/search" className="text-brand hover:underline font-semibold">
            Change search
          </Link>
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
            {data.length} {data.length === 1 ? 'bus' : 'buses'} found
          </p>
          {data.map((s) => (
            <ScheduleCard key={s.scheduleId} schedule={s} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <main className="min-h-screen flex flex-col p-6">
      <Suspense fallback={<div className="max-w-md w-full mx-auto text-center text-text-muted">Loading…</div>}>
        <ResultsInner />
      </Suspense>
    </main>
  );
}