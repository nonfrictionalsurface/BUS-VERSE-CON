'use client';

import React from 'react';
import { SeatAvailabilityItem } from '../api/seats.api';

interface SeatCellProps {
  seat: SeatAvailabilityItem;
  isSelectedByMe: boolean;
  onToggle: (seat: SeatAvailabilityItem) => void;
}

export const SeatCell: React.FC<SeatCellProps> = ({ seat, isSelectedByMe, onToggle }) => {
  const isBooked = seat.state === 'BOOKED';
  const isLockedByOther = seat.state === 'LOCKED' && !isSelectedByMe;

  let bgClass = 'bg-[var(--seat-available-bg)] border-[var(--seat-available-border)] text-[var(--seat-available-text)] hover:-translate-y-0.5';

  if (isBooked) {
    bgClass = 'bg-[var(--seat-booked-bg)] border-[var(--seat-booked-border)] text-[var(--seat-booked-text)] cursor-not-allowed';
  } else if (isSelectedByMe) {
    bgClass = 'bg-[var(--seat-selected-bg)] border-[var(--seat-selected-border)] text-[var(--seat-selected-text)] shadow-glow -translate-y-0.5';
  } else if (isLockedByOther) {
    bgClass = 'bg-[var(--seat-locked-bg)] border-[var(--seat-locked-border)] text-[var(--seat-locked-text)] animate-pulse cursor-not-allowed';
  } else if (seat.isFemaleOnly) {
    bgClass = 'bg-[var(--seat-female-bg)] border-[var(--seat-female-border)] text-[var(--seat-female-text)] hover:-translate-y-0.5';
  }

  return (
    <button
      type="button"
      disabled={isBooked || isLockedByOther}
      onClick={() => onToggle(seat)}
      className={`relative flex h-11 w-10 flex-col items-center justify-center rounded-lg border-2 font-mono text-[11px] font-bold transition-all ${bgClass}`}
      title={`${seat.seatLabel} - ${seat.isFemaleOnly ? 'Female preferred' : seat.state}`}
    >
      <span>{seat.seatLabel}</span>
      <div className="absolute bottom-1 h-0.5 w-6 rounded bg-black/20 dark:bg-white/20" />
    </button>
  );
};
