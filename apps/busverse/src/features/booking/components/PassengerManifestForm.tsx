'use client';

import React from 'react';
import { PassengerInput } from '../types';
import { MapPin, User, Armchair } from 'lucide-react';

interface StandOption {
  id: string;
  name: string;
  type: string;
  sequence: number;
}

interface PassengerManifestFormProps {
  stands: StandOption[];
  boardingStandId: string;
  droppingStandId: string;
  onBoardingChange: (id: string) => void;
  onDroppingChange: (id: string) => void;
  passengers: PassengerInput[];
  seatLabels?: string[];
  onPassengerChange: (index: number, updated: Partial<PassengerInput>) => void;
}

export function PassengerManifestForm({
  stands,
  boardingStandId,
  droppingStandId,
  onBoardingChange,
  onDroppingChange,
  passengers,
  seatLabels = [],
  onPassengerChange,
}: PassengerManifestFormProps) {
  const sortedStands = [...stands].sort((a, b) => a.sequence - b.sequence);

  return (
    <div className="space-y-6">
      {/* Boarding and Drop Points */}
      <section className="p-6 rounded-2xl bg-surface-card border border-border-hairline shadow-ambient">
        <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-ink-bright mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-primary" />
          <span>Boarding & Dropping Points</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase text-ink-muted mb-1.5">
              Pickup Stand
            </label>
            <select
              value={boardingStandId}
              onChange={(e) => onBoardingChange(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl bg-canvas border border-border-strong text-ink-bright focus:outline-none focus:border-brand-primary"
            >
              <option value="">Select Pickup Point</option>
              {sortedStands.map((st) => (
                <option key={`pickup-${st.id}`} value={st.id}>
                  {st.name} ({st.type.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase text-ink-muted mb-1.5">
              Drop Stand
            </label>
            <select
              value={droppingStandId}
              onChange={(e) => onDroppingChange(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl bg-canvas border border-border-strong text-ink-bright focus:outline-none focus:border-brand-primary"
            >
              <option value="">Select Drop Point</option>
              {sortedStands.map((st) => (
                <option key={`drop-${st.id}`} value={st.id}>
                  {st.name} ({st.type.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Passenger Demographics Cards */}
      <section className="p-6 rounded-2xl bg-surface-card border border-border-hairline shadow-ambient">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-ink-bright flex items-center gap-2">
            <User className="w-4 h-4 text-brand-primary" />
            <span>Passenger Details ({passengers.length} {passengers.length === 1 ? 'Seat' : 'Seats'})</span>
          </h2>
          <span className="text-xs text-ink-muted font-medium">1 ticket per seat</span>
        </div>

        <div className="space-y-4">
          {passengers.map((p, idx) => (
            <div
              key={p.seatId}
              className="p-4 rounded-xl bg-canvas-subtle border border-border-subtle"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-subtle text-brand-primary border border-brand-border">
                  Passenger {idx + 1}
                </span>

                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-ink-bright px-2 py-0.5 rounded bg-surface-card border border-border-strong">
                  <Armchair className="w-3.5 h-3.5 text-brand-primary" />
                  <span>Seat {seatLabels[idx] || p.seatId.slice(0, 4)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-mono font-bold uppercase text-ink-muted mb-1">
                    Full Name (As on Govt ID)
                  </label>
                  <input
                    type="text"
                    required
                    value={p.name}
                    placeholder={`Passenger ${idx + 1} Name`}
                    onChange={(e) => onPassengerChange(idx, { name: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-surface-card border border-border-strong text-ink-bright focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-mono font-bold uppercase text-ink-muted mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={119}
                    required
                    value={p.age || ''}
                    placeholder="Age"
                    onChange={(e) => onPassengerChange(idx, { age: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-surface-card border border-border-strong text-ink-bright focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-mono font-bold uppercase text-ink-muted mb-1">
                    Gender
                  </label>
                  <select
                    value={p.gender || 'MALE'}
                    onChange={(e) => onPassengerChange(idx, { gender: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-surface-card border border-border-strong text-ink-bright focus:outline-none focus:border-brand-primary"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}