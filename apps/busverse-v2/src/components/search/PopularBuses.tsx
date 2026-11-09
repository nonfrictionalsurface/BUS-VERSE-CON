'use client';

import { useEffect, useState } from 'react';
import { searchApi, ScheduleResult } from '@/lib/api/search.api';
import { ScheduleCard } from './ScheduleCard';
import { todayISODate } from '@/lib/utils/formatters';

const DEFAULT_ROUTE = { from: 'Delhi', to: 'Lucknow' } as const;

export function PopularBuses() {
  const [buses, setBuses] = useState<ScheduleResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeLabel, setRouteLabel] = useState<string>(`${DEFAULT_ROUTE.from} → ${DEFAULT_ROUTE.to}`);
  const [dateLabel, setDateLabel] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [fromCities, toCities] = await Promise.all([
          searchApi.cities(DEFAULT_ROUTE.from),
          searchApi.cities(DEFAULT_ROUTE.to),
        ]);

        const fromCity = fromCities.find(
          (c) => c.name.toLowerCase().startsWith(DEFAULT_ROUTE.from.toLowerCase()),
        );
        const toCity = toCities.find(
          (c) => c.name.toLowerCase().startsWith(DEFAULT_ROUTE.to.toLowerCase()),
        );

        if (!fromCity || !toCity) {
          if (!cancelled) setLoading(false);
          return;
        }

        // Try today first
        const today = todayISODate();
        let results = await searchApi.search({
          originCityId: fromCity.cityId,
          destinationCityId: toCity.cityId,
          date: today,
        });
        let shownDate = today;

        // If empty, try tomorrow
        if (results.length === 0) {
          const t = new Date();
          t.setDate(t.getDate() + 1);
          const tomorrow = t.toISOString().slice(0, 10);
          results = await searchApi.search({
            originCityId: fromCity.cityId,
            destinationCityId: toCity.cityId,
            date: tomorrow,
          });
          shownDate = tomorrow;
        }

        if (cancelled) return;

        setBuses(results);
        setRouteLabel(`${fromCity.name} → ${toCity.name}`);
        setDateLabel(
          shownDate === today ? 'Today' : `Tomorrow (${shownDate})`,
        );
      } catch (err) {
        console.error('[PopularBuses]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-surface border border-border-hairline rounded-lg p-5 animate-pulse"
          >
            <div className="h-4 bg-surface-sunken rounded w-1/3 mb-3" />
            <div className="h-6 bg-surface-sunken rounded w-2/3 mb-3" />
            <div className="h-10 bg-surface-sunken rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (buses.length === 0) {
    return (
      <div className="bg-surface border border-border-hairline rounded-lg p-8 text-center">
        <p className="text-base font-semibold text-text-bright mb-1">
          No popular buses right now
        </p>
        <p className="text-sm text-text-muted">
          Search above to find buses on your route.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider">
            {routeLabel}
          </p>
          {dateLabel && (
            <p className="text-xs text-text-muted font-mono mt-0.5">{dateLabel}</p>
          )}
        </div>
        <p className="text-xs text-text-muted">
          {buses.length} {buses.length === 1 ? 'bus' : 'buses'}
        </p>
      </div>
      {buses.map((b) => (
        <ScheduleCard key={b.scheduleId} schedule={b} />
      ))}
    </div>
  );
}