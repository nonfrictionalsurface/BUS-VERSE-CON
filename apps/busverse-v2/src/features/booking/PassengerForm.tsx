'use client';

import { useMemo, useState } from 'react';
import type { Stand } from '@/lib/api/bookings.api';
import type { SeatLock } from '@/features/seats/api/seats.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatINR } from '@/lib/utils/formatters';

export interface PassengerInput {
  seatId: string;
  seatLabel: string;
  name: string;
  age: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | '';
}

interface PassengerFormProps {
  scheduleId: string;
  locks: SeatLock[];
  stops: Stand[];
  farePerSeatPaise: number;
  onSubmit: (data: {
    boardingStandId: string;
    droppingStandId: string;
    passengers: PassengerInput[];
  }) => Promise<void>;
  submitting: boolean;
  error: string | null;
}

export function PassengerForm({
  locks,
  stops,
  farePerSeatPaise,
  onSubmit,
  submitting,
  error,
}: PassengerFormProps) {
  const sortedStops = useMemo(() => [...stops].sort((a, b) => a.sequence - b.sequence), [stops]);

  const [boardingStandId, setBoardingStandId] = useState<string>(sortedStops[0]?.standId ?? '');
  const [droppingStandId, setDroppingStandId] = useState<string>(
    sortedStops[sortedStops.length - 1]?.standId ?? '',
  );
  const [passengers, setPassengers] = useState<PassengerInput[]>(
    locks.map((l) => ({
      seatId: l.seatId,
      seatLabel: l.seatLabel,
      name: '',
      age: '',
      gender: '',
    })),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const boardingStops = sortedStops.slice(0, Math.max(1, sortedStops.length - 1));
  const droppingStops = sortedStops.slice(1);

  const updatePassenger = (idx: number, patch: Partial<PassengerInput>) => {
    setPassengers((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const validate = (): string | null => {
    if (!boardingStandId) return 'Select a boarding stand.';
    if (!droppingStandId) return 'Select a dropping stand.';
    const bIdx = sortedStops.findIndex((s) => s.standId === boardingStandId);
    const dIdx = sortedStops.findIndex((s) => s.standId === droppingStandId);
    if (bIdx < 0 || dIdx < 0) return 'Invalid stand selection.';
    if (bIdx >= dIdx) return 'Dropping stand must come after boarding stand.';

    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.name.trim() || p.name.trim().length < 2) return `Passenger ${i + 1}: enter a valid name.`;
      const age = parseInt(p.age, 10);
      if (isNaN(age) || age < 1 || age > 119) return `Passenger ${i + 1}: enter a valid age (1–119).`;
      if (!p.gender) return `Passenger ${i + 1}: select a gender.`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const err = validate();
    if (err) {
      setLocalError(err);
      return;
    }
    try {
      await onSubmit({ boardingStandId, droppingStandId, passengers });
    } catch (err) {
      /* parent handles error state */
    }
  };

  const totalPaise = farePerSeatPaise * locks.length;
  const shownError = localError ?? error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-surface border border-border-hairline rounded-lg p-4">
        <p className="text-xs font-mono uppercase text-text-muted tracking-wider mb-2">
          Boarding stand
        </p>
        <select
          value={boardingStandId}
          onChange={(e) => setBoardingStandId(e.target.value)}
          className="w-full h-11 px-3 rounded-lg bg-surface text-text-primary border border-border-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-border-focus"
        >
          {boardingStops.map((s) => (
            <option key={s.standId} value={s.standId}>
              {s.name}
            </option>
          ))}
        </select>

        <p className="text-xs font-mono uppercase text-text-muted tracking-wider mb-2 mt-4">
          Dropping stand
        </p>
        <select
          value={droppingStandId}
          onChange={(e) => setDroppingStandId(e.target.value)}
          className="w-full h-11 px-3 rounded-lg bg-surface text-text-primary border border-border-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-border-focus"
        >
          {droppingStops.map((s) => (
            <option key={s.standId} value={s.standId}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {passengers.map((p, idx) => (
        <div
          key={p.seatId}
          className="bg-surface border border-border-hairline rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border-hairline">
            <span className="text-xs font-mono uppercase text-text-muted">
              Passenger {idx + 1}
            </span>
            <span className="text-sm font-bold font-mono text-brand px-2 py-0.5 rounded bg-brand-subtle border border-brand-border">
              Seat {p.seatLabel}
            </span>
          </div>

          <Input
            label="Full name"
            value={p.name}
            onChange={(e) => updatePassenger(idx, { name: e.target.value })}
            placeholder="e.g. Alice Sharma"
            autoComplete="name"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Age"
              type="number"
              inputMode="numeric"
              value={p.age}
              onChange={(e) => updatePassenger(idx, { age: e.target.value })}
              placeholder="e.g. 28"
              min={1}
              max={119}
            />
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Gender
              </label>
              <select
                value={p.gender}
                onChange={(e) =>
                  updatePassenger(idx, { gender: e.target.value as PassengerInput['gender'] })
                }
                className="w-full h-11 px-3 rounded-lg bg-surface text-text-primary border border-border-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-border-focus"
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>
      ))}

      {shownError && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-[var(--danger-crimson-subtle)] border border-[var(--danger-crimson)] text-sm text-[var(--danger-crimson)]"
        >
          {shownError}
        </div>
      )}

      <div className="bg-surface border border-border-strong rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-text-secondary">
            {locks.length} {locks.length === 1 ? 'seat' : 'seats'} · fare per seat
          </span>
          <span className="text-sm font-mono text-text-primary">
            {formatINR(farePerSeatPaise)}
          </span>
        </div>
        <div className="flex items-center justify-between pb-4 border-b border-border-hairline">
          <span className="text-sm font-semibold text-text-bright">Total</span>
          <span className="text-lg font-bold font-mono text-text-bright">
            {formatINR(totalPaise)}
          </span>
        </div>
        <Button type="submit" loading={submitting} fullWidth className="mt-4">
          Continue to payment
        </Button>
      </div>
    </form>
  );
}