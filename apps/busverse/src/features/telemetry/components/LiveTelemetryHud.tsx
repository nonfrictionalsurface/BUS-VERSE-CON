'use client';

import React from 'react';
import { LiveTripSnapshot } from '@/features/tickets/types';
import { formatISTTime } from '@/lib/utils/formatters';
import { LiveMap } from './LiveMap';
import { Radio, Bus, MapPin, Gauge, Clock, ShieldCheck } from 'lucide-react';

interface LiveTelemetryHudProps {
  snapshot: LiveTripSnapshot;
}

export function LiveTelemetryHud({ snapshot }: LiveTelemetryHudProps) {
  const isEnRoute = snapshot.status === 'IN_PROGRESS';
  const speed = snapshot.gps?.speedKmh || 0;

  const stops = snapshot.stops || [];
  const passedStops = stops.filter((s) => s.status === 'PASSED').length;
  const progressPct = stops.length > 1 ? Math.min(100, Math.round((passedStops / (stops.length - 1)) * 100)) : 45;

  const nextStop = stops.find((s) => s.status === 'PENDING') || stops[stops.length - 1];

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-card border-2 border-border-strong shadow-floating">
      {/* Top Beacon Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border-hairline">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-ink-bright">
              {snapshot.bus?.model} ({snapshot.bus?.registrationNumber})
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface-sunken border border-border-subtle uppercase">
              {snapshot.bus?.busType}
            </span>
          </div>
          <span className="text-xs text-ink-muted">TRIP ID: {snapshot.tripId.slice(0, 8)}...</span>
        </div>

        <div className="flex items-center gap-2">
          {isEnRoute ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-signal-subtle border border-signal-emerald text-signal-emerald text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-signal-emerald animate-ping" />
              GPS STREAM ACTIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-sunken border border-border-subtle text-ink-muted text-xs font-mono font-semibold">
              <Clock className="w-3.5 h-3.5" />
              {snapshot.status}
            </span>
          )}
        </div>
      </div>

      {/* Real Map Tiles */}
      <LiveMap gps={snapshot.gps} stops={stops} />

      {/* Progress Track with Moving Vehicle Marker */}
      <div className="my-8 px-4">
        <div className="relative h-2.5 bg-surface-sunken rounded-full">
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 shadow-glow"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, var(--brand-primary), var(--telemetry-cyan))',
            }}
          />

          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-surface-card border-2 border-telemetry-cyan flex items-center justify-center shadow-glow transition-all duration-1000"
            style={{ left: `${progressPct}%` }}
          >
            <Bus className="w-4 h-4 text-telemetry-cyan" />
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono text-ink-muted mt-3">
          <span>{stops[0]?.name || 'Origin Stand'}</span>
          <span>{stops[stops.length - 1]?.name || 'Final Stand'}</span>
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-canvas-subtle border border-border-hairline">
          <div className="flex items-center justify-between text-ink-muted text-xs font-mono mb-1">
            <span>VELOCITY</span>
            <Gauge className="w-3.5 h-3.5 text-telemetry-cyan" />
          </div>
          <div className="text-2xl font-black text-ink-bright">{speed} km/h</div>
          <span className="text-[10px] text-signal-emerald font-semibold">
            {speed > 0 ? 'Normal Highway Speed' : 'Stationary at Stop'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-canvas-subtle border border-border-hairline">
          <div className="flex items-center justify-between text-ink-muted text-xs font-mono mb-1">
            <span>NEXT STAND</span>
            <MapPin className="w-3.5 h-3.5 text-brand-primary" />
          </div>
          <div className="text-base font-extrabold text-ink-bright truncate">
            {nextStop?.name || 'In Transit'}
          </div>
          <span className="text-[10px] text-telemetry-cyan font-semibold">
            ETA: {nextStop?.estimatedArrival ? formatISTTime(nextStop.estimatedArrival) : 'Calculating...'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-canvas-subtle border border-border-hairline">
          <div className="flex items-center justify-between text-ink-muted text-xs font-mono mb-1">
            <span>SCHEDULE STATUS</span>
            <Clock className="w-3.5 h-3.5 text-warning-amber" />
          </div>
          <div className="text-base font-extrabold text-ink-bright">
            {snapshot.delayMinutes > 0 ? `+${snapshot.delayMinutes} min delay` : 'On Time'}
          </div>
          <span className="text-[10px] text-ink-muted">Synchronized via Socket.io</span>
        </div>
      </div>
    </div>
  );
}