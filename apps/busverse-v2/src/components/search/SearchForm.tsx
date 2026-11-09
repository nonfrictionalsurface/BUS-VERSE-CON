'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CityAutocomplete } from './CityAutocomplete';
import { Button } from '@/components/ui/Button';
import { City } from '@/lib/api/search.api';
import { todayISODate } from '@/lib/utils/formatters';

interface SearchFormProps {
  initialOrigin?: City | null;
  initialDestination?: City | null;
  initialDate?: string;
}

export function SearchForm({ initialOrigin, initialDestination, initialDate }: SearchFormProps) {
  const router = useRouter();
  const [origin, setOrigin] = useState<City | null>(initialOrigin ?? null);
  const [destination, setDestination] = useState<City | null>(initialDestination ?? null);
  const [date, setDate] = useState<string>(initialDate ?? todayISODate());
  const [error, setError] = useState<string | null>(null);

  const canSearch = !!origin && !!destination && !!date && origin.cityId !== destination.cityId;
  const today = todayISODate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!origin || !destination) {
      setError('Pick both origin and destination cities.');
      return;
    }
    if (origin.cityId === destination.cityId) {
      setError('Origin and destination must be different.');
      return;
    }
    if (!date) {
      setError('Pick a travel date.');
      return;
    }

    const qs = new URLSearchParams({
      from: origin.cityId,
      to: destination.cityId,
      date,
      fromName: origin.name,
      toName: destination.name,
    }).toString();

    router.push(`/results?${qs}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CityAutocomplete
        label="From"
        value={origin}
        onChange={setOrigin}
        placeholder="Origin city"
        autoFocus
      />
      <CityAutocomplete
        label="To"
        value={destination}
        onChange={setDestination}
        placeholder="Destination city"
      />
      <div className="space-y-2">
        <label htmlFor="date-input" className="block text-sm font-semibold text-text-primary">
          Travel date
        </label>
        <input
          id="date-input"
          type="date"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-11 px-4 rounded-lg bg-surface text-text-primary border border-border-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-border-focus"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-crimson">{error}</p>
      )}
      <Button type="submit" disabled={!canSearch} fullWidth>
        Search buses
      </Button>
    </form>
  );
}