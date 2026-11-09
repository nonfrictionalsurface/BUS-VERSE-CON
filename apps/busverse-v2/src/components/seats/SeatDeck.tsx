'use client';

import type { Seat, SeatLayout } from '@/features/seats/api/seats.api';
import { SeatCell } from './SeatCell';

interface SeatDeckProps {
  seats: Seat[];
  layout: SeatLayout;
  selectedSeatIds: string[];
  onSeatClick: (seat: Seat) => void;
  disabled?: boolean;
}

export function SeatDeck({
  seats,
  layout,
  selectedSeatIds,
  onSeatClick,
  disabled = false,
}: SeatDeckProps) {
  const seatByKey = new Map<string, Seat>();
  seats.forEach((s) => seatByKey.set(`${s.seatRow}${s.seatColumn}`, s));

  const rowLetters: string[] = [];
  for (let r = 0; r < layout.rowsCount; r++) {
    rowLetters.push(String.fromCharCode(65 + r));
  }

  const cols = layout.columnsCount;
  const leftCols = Math.min(2, Math.max(1, cols - 1));
  const rightCols = cols - leftCols;
  const selectedSet = new Set(selectedSeatIds);

  return (
    <div className="inline-block p-6 rounded-3xl bg-surface border-2 border-border-strong shadow-floating">
      <div className="mb-5 pb-4 border-b-2 border-dashed border-border-subtle flex items-center gap-8 justify-between">
        <div className="h-6 px-3 rounded-t-lg bg-[var(--telemetry-cyan-subtle)] border border-[var(--telemetry-cyan)] flex items-center justify-center text-[10px] font-mono font-bold text-[var(--telemetry-cyan)] uppercase tracking-wider">
          Windshield
        </div>
        <span className="text-[10px] font-mono font-semibold uppercase text-text-muted">
          Driver
        </span>
      </div>

      <div className="space-y-2.5">
        {rowLetters.map((rowChar) => {
          const leftSeats: Seat[] = [];
          const rightSeats: Seat[] = [];
          for (let c = 1; c <= leftCols; c++) {
            const s = seatByKey.get(`${rowChar}${c}`);
            if (s) leftSeats.push(s);
          }
          for (let c = leftCols + 1; c <= cols; c++) {
            const s = seatByKey.get(`${rowChar}${c}`);
            if (s) rightSeats.push(s);
          }

          return (
            <div key={rowChar} className="flex items-center gap-1 justify-center">
              <span className="w-5 text-[10px] font-mono font-bold text-text-muted text-center">
                {rowChar}
              </span>
              <div className="flex gap-1.5">
                {leftSeats.length > 0 ? leftSeats.map((s) => (
                  <SeatCell
                    key={s.id}
                    seat={s}
                    isSelectedByMe={selectedSet.has(s.id)}
                    onToggle={onSeatClick}
                    disabled={disabled}
                  />
                )) : <div className="w-10 h-11" aria-hidden="true" />}
              </div>
              <div className="w-5" aria-hidden="true" />
              <div className="flex gap-1.5">
                {rightSeats.length > 0 ? rightSeats.map((s) => (
                  <SeatCell
                    key={s.id}
                    seat={s}
                    isSelectedByMe={selectedSet.has(s.id)}
                    onToggle={onSeatClick}
                    disabled={disabled}
                  />
                )) : <div className="w-10 h-11" aria-hidden="true" />}
              </div>
              <span className="w-5 text-[10px] font-mono font-bold text-text-muted text-center">
                {rowChar}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-3 border-t-2 border-border-subtle text-center">
        <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest">
          Rear exit
        </span>
      </div>
    </div>
  );
}