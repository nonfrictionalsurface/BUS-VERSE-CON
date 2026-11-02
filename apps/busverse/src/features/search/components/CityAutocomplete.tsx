'use client';

import React, { useState, useEffect, useRef } from 'react';
import { City, searchApi } from '../api/search.api';
import { MapPin, Loader2 } from 'lucide-react';

interface CityAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  selectedCity: City | null;
  onSelect: (city: City) => void;
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  label,
  placeholder,
  selectedCity,
  onSelect,
}) => {
  const [query, setQuery] = useState(selectedCity?.name || '');
  const [cities, setCities] = useState<City[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedCity) setQuery(selectedCity.name);
  }, [selectedCity]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const fetchTimer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchApi.getCities(query);
        setCities(results);
      } catch (err) {
        console.error('City fetch error', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(fetchTimer);
  }, [query, isOpen]);

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
        {label}
      </label>
      <div className="relative flex items-center">
        <MapPin className="absolute left-3.5 h-4 w-4 text-brand-primary" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          className="w-full rounded-xl border border-border-subtle bg-surface-sunken pl-10 pr-4 py-3 text-xs font-semibold text-ink-bright placeholder-ink-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
        {isLoading && <Loader2 className="absolute right-3.5 h-4 w-4 animate-spin text-ink-muted" />}
      </div>

      {isOpen && cities.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-border-strong bg-surface-card p-1 shadow-floating z-50">
          {cities.map((city) => (
            <li
              key={city.id}
              onClick={() => {
                onSelect(city);
                setQuery(city.name);
                setIsOpen(false);
              }}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-ink-primary hover:bg-surface-hover cursor-pointer"
            >
              <span className="font-semibold">{city.name}</span>
              <span className="font-mono text-[10px] text-ink-muted">{city.state}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
