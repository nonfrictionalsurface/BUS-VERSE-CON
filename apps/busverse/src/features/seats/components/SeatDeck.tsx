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
  // Group seats by their distinct row
  const rowMap = new Map<string, Seat[]>();
  seats.forEach((seat) => {
    const rowKey = String(seat.seatRow);
    if (!rowMap.has(rowKey)) {
      rowMap.set(rowKey, []);
    }
    rowMap.get(rowKey)!.push(seat);
  });

  // Sort seats within each row by column ascending
  rowMap.forEach((rowSeats) => {
    rowSeats.sort((a, b) => a.seatColumn - b.seatColumn);
  });

  // Sort row entries (e.g. A, B, C or 1, 2, 3)
  const sortedRows = Array.from(rowMap.entries()).sort(([a], [b]) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

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

      {/* Seat Rows (Vertical coach layout) */}
      <div className="space-y-3.5">
        {sortedRows.map(([rowKey, rowSeats]) => {
          // 2x2 layout separation: Left pair (columns <= 2) vs Right pair (columns > 2)
          const leftPair = rowSeats.filter((s) => s.seatColumn <= 2);
          const rightPair = rowSeats.filter((s) => s.seatColumn > 2);

          return (
            <div key={rowKey} className="flex items-center justify-between gap-2">
              {/* Left Seat Pair */}
              <div className="flex items-center gap-2">
                {leftPair.map((seat) => (
                  <SeatCell
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeatId === seat.id}
                    onSelect={onSeatClick}
                    disabled={disabled}
                  />
                ))}
              </div>

              {/* Central Walking Aisle */}
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[11px] font-mono font-bold text-ink-muted/50 select-none">
                  {rowKey}
                </span>
              </div>

              {/* Right Seat Pair */}
              <div className="flex items-center gap-2">
                {rightPair.map((seat) => (
                  <SeatCell
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeatId === seat.id}
                    onSelect={onSeatClick}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          );
        })}
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