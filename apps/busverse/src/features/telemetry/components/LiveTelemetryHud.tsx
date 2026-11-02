'use client';

import React from 'react';
import { Gauge, MapPin, Users } from 'lucide-react';

interface TelemetryHudProps {
  speedKmh: number;
  nextStandName?: string;
  etaMinutes?: number;
  totalSeats?: number;
  occupiedSeats?: number;
}

export const LiveTelemetryHud: React.FC<TelemetryHudProps> = ({
  speedKmh = 0,
  nextStandName = 'Next Terminal',
  etaMinutes = 0,
  totalSeats = 40,
  occupiedSeats = 28,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-2xl border border-border-subtle bg-surface-card p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-ink-muted uppercase">
          <Gauge className="h-3.5 w-3.5 text-telemetry-cyan" />
          <span>Vehicle Speed</span>
        </div>
        <div className="mt-1 font-mono text-2xl font-extrabold text-ink-bright">
          {Math.round(speedKmh)} <span className="text-xs text-ink-muted">km/h</span>
        </div>
        <div className="text-[11px] font-semibold text-signal-emerald">Highway Cruise</div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-card p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-ink-muted uppercase">
          <MapPin className="h-3.5 w-3.5 text-telemetry-cyan" />
          <span>Next Boarding Point</span>
        </div>
        <div className="mt-1 font-sans text-sm font-bold text-ink-bright truncate">
          {nextStandName}
        </div>
        <div className="text-[11px] font-mono text-telemetry-cyan">
          ETA ~{etaMinutes} min
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-surface-card p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-ink-muted uppercase">
          <Users className="h-3.5 w-3.5 text-telemetry-cyan" />
          <span>Occupancy</span>
        </div>
        <div className="mt-1 font-mono text-2xl font-extrabold text-ink-bright">
          {occupiedSeats} / {totalSeats}
        </div>
        <div className="text-[11px] font-semibold text-ink-muted">Seats Locked/Booked</div>
      </div>
    </div>
  );
};
