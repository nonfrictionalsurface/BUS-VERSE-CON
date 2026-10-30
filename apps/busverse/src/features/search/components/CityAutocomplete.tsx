'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetchCities } from '../api/search.api';
import { City } from '../types';
import { MapPin, X, Loader2 } from 'lucide-react';

interface CityAutocompleteProps {
  label: string;
  placeholder?: string;
  value: City | null;
  onChange: (city: City | null) => void;
  excludeCityId?: string;
}

export function CityAutocomplete({
  label,
  placeholder = 'Select station...',
  value,
  onChange,
  excludeCityId,
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value ? value.name : '');
  const [isOpen, setIsOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value ? value.name : '');
  }, [value]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await fetchCities(query, 50);
        if (active) setCities(data);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = cities.filter((c) => c.id !== excludeCityId);

  const handleSelect = (city: City) => {
    onChange(city);
    setQuery(city.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink-muted mb-1.5">
        {label}
      </label>

      <div className="relative flex items-center">
        <MapPin className="absolute left-3 w-4 h-4 text-brand-primary pointer-events-none" />

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (value && e.target.value !== value.name) {
              onChange(null);
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2.5 text-sm font-semibold rounded-xl bg-surface-card border border-border-strong text-ink-bright placeholder-ink-muted focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-subtle transition-all"
        />

        {isLoading ? (
          <Loader2 className="absolute right-3 w-4 h-4 text-ink-muted animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-0.5 rounded-full hover:bg-surface-hover text-ink-muted hover:text-ink-primary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-surface-card border border-border-strong shadow-floating p-1.5">
          {filteredCities.length === 0 ? (
            <div className="p-3 text-xs text-ink-muted text-center">
              {isLoading ? 'Searching transit hubs...' : 'No cities found'}
            </div>
          ) : (
            filteredCities.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => handleSelect(city)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs font-semibold rounded-lg transition-colors ${
                  value?.id === city.id
                    ? 'bg-brand-subtle text-brand-primary'
                    : 'text-ink-primary hover:bg-surface-hover hover:text-ink-bright'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 opacity-60" />
                  <span>{city.name}</span>
                </div>
                <span className="text-[10px] font-mono font-medium text-ink-muted px-1.5 py-0.5 rounded bg-surface-sunken">
                  {city.state}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}