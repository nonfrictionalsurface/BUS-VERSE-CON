'use client';

import { useState, useRef, useEffect } from 'react';
import { City, routesApi } from '../api';
import { Input } from '@/components/ui/Input';
import { Search, MapPin, Loader2 } from 'lucide-react';

interface Props {
  label: string;
  value: City | null;
  onChange: (city: City) => void;
  placeholder?: string;
}

export function CityAutocomplete({ label, value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState(value?.name || '');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<City[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const cities = await routesApi.searchCities(query);
        setResults(cities);
        setIsOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        label={label}
        placeholder={placeholder || "Search city..."}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange(null as any); // clear selection if typing
        }}
        onFocus={() => { if (query.length >= 2) setIsOpen(true); }}
      />
      {isSearching && (
        <div className="absolute right-3 top-9 text-ink-muted">
          <Loader2 size={16} className="animate-spin" />
        </div>
      )}
      
      {isOpen && results.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-surface-card border border-line-hairline rounded-lg shadow-floating max-h-60 overflow-auto">
          {results.map((city) => (
            <li
              key={city.id}
              onClick={() => {
                setQuery(city.name);
                onChange(city);
                setIsOpen(false);
              }}
              className="px-4 py-2 hover:bg-surface-hover cursor-pointer flex items-center gap-2 text-sm"
            >
              <MapPin size={14} className="text-brand-text" />
              <span className="font-medium text-ink-primary">{city.name}</span>
              <span className="text-xs text-ink-muted">{city.state}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}