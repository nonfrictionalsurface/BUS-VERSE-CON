'use client';

import React from 'react';
import { ScheduleAvailabilityResponse, SeatAvailabilityItem } from '../api/seats.api';
import { SeatCell } from './SeatCell';

interface SeatDeckProps {
  data: ScheduleAvailabilityResponse;
  selectedSeats: SeatAvailabilityItem[];
  onToggleSeat: (seat: SeatAvailabilityItem) => void;
}

export const SeatDeck: React.FC<SeatDeckProps> = ({ data, selectedSeats, onToggleSeat }) => {
  // Group seats by row
  const rowsMap: Record<string, SeatAvailabilityItem[]> = {};
  data.seats.forEach((seat) => {
    if (!rowsMap[seat.seatRow]) rowsMap[seat.seatRow] = [];
    rowsMap[seat.seatRow].push(seat);
  });

  const rowLetters = Object.keys(rowsMap).sort();

  return (
    <div className="relative mx-auto w-full max-w-sm rounded-[36px] border-2 border-border-strong bg-surface-card p-6 pt-12 shadow-floating">
      {/* Driver Windshield Indicator */}
      <div className="absolute left-6 right-6 top-3 h-5 rounded-t-xl border border-telemetry-cyan bg-gradient-to-b from-telemetry-cyan/20 to-transparent" />

      <div className="space-y-3">
        {rowLetters.map((rowLetter) => {
          const rowSeats = rowsMap[rowLetter].sort((a, b) => a.seatColumn - b.seatColumn);
          const leftPair = rowSeats.slice(0, 2);
          const rightPair = rowSeats.slice(2);

          return (
            <div key={rowLetter} className="flex items-center justify-between">
              {/* Left pair */}
              <div className="flex gap-2">
                {leftPair.map((seat) => (
                  <SeatCell
                    key={seat.id}
                    seat={seat}
                    isSelectedByMe={selectedSeats.some((s) => s.id === seat.id)}
                    onToggle={onToggleSeat}
                  />
                ))}
              </div>

              {/* Center Aisle */}
              <div className="w-6 font-mono text-[10px] text-center text-ink-muted">{rowLetter}</div>

              {/* Right pair */}
              <div className="flex gap-2">
                {rightPair.map((seat) => (
                  <SeatCell
                    key={seat.id}
                    seat={seat}
                    isSelectedByMe={selectedSeats.some((s) => s.id === seat.id)}
                    onToggle={onToggleSeat}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
