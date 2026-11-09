'use client';

import { useEffect, useRef, useState } from 'react';
import { searchApi, City } from '@/lib/api/search.api';

interface CityAutocompleteProps {
  label: string;
  value: City | null;
  onChange: (city: City | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function CityAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  disabled,
}: CityAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(`${value.name}${value.state ? `, ${value.state}` : ''}`);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const runSearch = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchApi.cities(q);
        setOptions(results);
        setHighlight(0);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (value) onChange(null);
    setOpen(true);
    runSearch(v);
  };

  const select = (c: City) => {
    onChange(c);
    setQuery(`${c.name}${c.state ? `, ${c.state}` : ''}`);
    setOpen(false);
    setOptions([]);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (options[highlight]) { e.preventDefault(); select(options[highlight]); }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <label className="block text-sm font-semibold text-text-primary mb-2">
        {label}
      </label>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={query}
        onChange={handleChange}
        onFocus={() => { if (query.length >= 2 && options.length > 0) setOpen(true); }}
        onKeyDown={handleKey}
        placeholder={placeholder ?? 'Search for a city'}
        autoFocus={autoFocus}
        disabled={disabled}
        className="w-full h-11 px-4 rounded-lg bg-surface text-text-primary border border-border-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-border-focus disabled:opacity-60"
      />
      {open && (query.length >= 2) && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-surface border border-border-subtle rounded-lg shadow-floating max-h-72 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-text-muted">Searching…</div>
          )}
          {!loading && options.length === 0 && (
            <div className="px-4 py-3 text-sm text-text-muted">No cities found</div>
          )}
          {options.map((c, i) => (
            <button
              key={c.cityId}
              type="button"
              onClick={() => select(c)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                i === highlight
                  ? 'bg-brand-subtle text-text-bright'
                  : 'text-text-primary hover:bg-surface-hover'
              }`}
            >
              <span className="font-semibold">{c.name}</span>
              {c.state && <span className="text-text-muted">, {c.state}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}