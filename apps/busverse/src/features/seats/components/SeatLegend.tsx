'use client';

import React from 'react';

export function SeatLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-4 px-6 rounded-2xl bg-surface-card border border-border-hairline shadow-ambient text-xs font-semibold">
      {/* Available */}
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-md border flex items-center justify-center text-[10px]"
          style={{
            backgroundColor: 'var(--seat-available-bg)',
            borderColor: 'var(--seat-available-border)',
            color: 'var(--seat-available-text)',
          }}
        />
        <span className="text-ink-secondary">Available</span>
      </div>

      {/* Selected */}
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-md border shadow-glow flex items-center justify-center text-[10px]"
          style={{
            backgroundColor: 'var(--seat-selected-bg)',
            borderColor: 'var(--seat-selected-border)',
            color: 'var(--seat-selected-text)',
          }}
        />
        <span className="text-ink-secondary">Selected</span>
      </div>

      {/* Locked */}
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-md border animate-seat-lock flex items-center justify-center text-[10px]"
          style={{
            backgroundColor: 'var(--seat-locked-bg)',
            borderColor: 'var(--seat-locked-border)',
            color: 'var(--seat-locked-text)',
          }}
        />
        <span className="text-ink-secondary">Locked (5m TTL)</span>
      </div>

      {/* Booked */}
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-md border flex items-center justify-center text-[10px]"
          style={{
            backgroundColor: 'var(--seat-booked-bg)',
            borderColor: 'var(--seat-booked-border)',
            color: 'var(--seat-booked-text)',
          }}
        />
        <span className="text-ink-secondary">Booked</span>
      </div>

      {/* Female-Only */}
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded-md border flex items-center justify-center text-[10px]"
          style={{
            backgroundColor: 'var(--seat-female-bg)',
            borderColor: 'var(--seat-female-border)',
            color: 'var(--seat-female-text)',
          }}
        />
        <span className="text-ink-secondary">Female Only</span>
      </div>
    </div>
  );
}