'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { City } from '../api/search.api';
import { CityAutocomplete } from './CityAutocomplete';
import { Calendar, Search } from 'lucide-react';

export const SearchForm: React.FC = () => {
  const router = useRouter();
  const [origin, setOrigin] = useState<City | null>(null);
  const [destination, setDestination] = useState<City | null>(null);
  const [travelDate, setTravelDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!origin || !destination) {
      setValidationError('Please select both Origin and Destination cities');
      return;
    }

    if (origin.id === destination.id) {
      setValidationError('Origin and destination cannot be the same city');
      return;
    }

    router.push(
      `/?from=${origin.id}&to=${destination.id}&date=${travelDate}&fromName=${encodeURIComponent(
        origin.name
      )}&toName=${encodeURIComponent(destination.name)}`
    );
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border-subtle bg-surface-card p-4 sm:p-6 shadow-floating">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <CityAutocomplete
          label="Origin"
          placeholder="Where from?"
          selectedCity={origin}
          onSelect={setOrigin}
        />

        <CityAutocomplete
          label="Destination"
          placeholder="Where to?"
          selectedCity={destination}
          onSelect={setDestination}
        />

        <div className="flex-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
            Date of Journey
          </label>
          <div className="relative flex items-center">
            <Calendar className="absolute left-3.5 h-4 w-4 text-brand-primary" />
            <input
              type="date"
              value={travelDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-surface-sunken pl-10 pr-4 py-3 text-xs font-semibold text-ink-bright focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-primary px-8 font-sans text-xs font-bold text-white shadow-glow hover:bg-brand-hover transition-all"
        >
          <Search className="h-4 w-4" />
          <span>Find Buses</span>
        </button>
      </div>

      {validationError && (
        <p className="mt-3 text-xs font-semibold text-danger-crimson">{validationError}</p>
      )}
    </form>
  );
};
