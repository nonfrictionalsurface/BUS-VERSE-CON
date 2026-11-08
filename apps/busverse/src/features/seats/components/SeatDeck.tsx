'use client';

import React from 'react';
import { Seat, SeatLayout } from '../types';
import { SeatCell } from './SeatCell';
import { Disc3 } from 'lucide-react';

interface SeatDeckProps {
  seats: Seat[];
  layout: SeatLayout;
  selectedSeatId: string | null;
  onSeatClick: (seat: Seat) => void;
  disabled?: boolean;
}

export function SeatDeck({
  seats,
  layout,
  selectedSeatId,
  onSeatClick,
  disabled = false,
}: SeatDeckProps) {
  // Build a lookup: "A1" -> seat
  const seatByLabel = new Map<string, Seat>();
  seats.forEach((s) => seatByLabel.set(`${String(s.seatRow)}${s.seatColumn}`, s));

  const rowLetters: string[] = [];
  for (let r = 0; r < layout.rowsCount; r++) {
    rowLetters.push(String.fromCharCode(65 + r));
  }

  const cols = layout.columnsCount;

  return (
    <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-surface-card border-2 border-border-strong shadow-floating relative">
      {/* Front Windshield & Steering Cab */}
      <div className="relative mb-6 pb-4 border-b-2 border-dashed border-border-subtle flex items-center justify-between">
        <div className="h-6 px-3 rounded-t-lg bg-telemetry-subtle border border-telemetry-cyan flex items-center justify-center text-[10px] font-mono font-bold text-telemetry-cyan uppercase tracking-wider">
          Windshield
        </div>
        <div className="flex items-center gap-1.5 text-ink-muted">
          <Disc3 className="w-6 h-6 animate-spin text-ink-secondary" style={{ animationDuration: '8s' }} />
          <span className="text-[10px] font-mono font-semibold uppercase">Driver</span>
        </div>
      </div>

      {/* Seat Rows — render exact grid from layout */}
      <div className="space-y-3">
        {rowLetters.map((rowChar) => (
          <div key={rowChar} className="flex items-center gap-1 justify-center">
            {/* Row letter on left */}
            <span className="w-5 text-[10px] font-mono font-bold text-ink-muted text-center">
              {rowChar}
            </span>

            {/* One cell per column — seat or empty aisle */}
            {Array.from({ length: cols }, (_, i) => {
              const colNum = i + 1;
              const seat = seatByLabel.get(`${rowChar}${colNum}`);

              if (!seat) {
                // Empty cell — this is an aisle / unassigned coordinate
                return (
                  <div
                    key={`${rowChar}${colNum}`}
                    className="w-9 h-9 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <div className="w-1 h-1 rounded-full bg-border-subtle" />
                  </div>
                );
              }

              return (
                <div key={seat.id} className="w-9">
                  <SeatCell
                    seat={seat}
                    isSelected={selectedSeatId === seat.id}
                    onSelect={onSeatClick}
                    disabled={disabled}
                  />
                </div>
              );
            })}

            {/* Row letter on right */}
            <span className="w-5 text-[10px] font-mono font-bold text-ink-muted text-center">
              {rowChar}
            </span>
          </div>
        ))}
      </div>

      {/* Rear Coach Exit */}
      <div className="mt-8 pt-3 border-t-2 border-border-subtle text-center">
        <span className="text-[10px] font-mono font-bold text-ink-muted uppercase tracking-widest">
          Coach Rear Entry
        </span>
      </div>
    </div>
  );
}
