'use client';

import React from 'react';
import { Seat } from '../types';

interface SeatCellProps {
  seat: Seat;
  isSelected: boolean;
  onSelect: (seat: Seat) => void;
  disabled?: boolean;
}

export function SeatCell({ seat, isSelected, onSelect, disabled = false }: SeatCellProps) {
  const isBooked = seat.status === 'BOOKED' || seat.status === 'BLOCKED';
  const isLocked = seat.status === 'LOCKED' && !isSelected;
  const isFemale = seat.isFemaleOnly && !isSelected && !isBooked && !isLocked;

  let bg = 'var(--seat-available-bg)';
  let border = 'var(--seat-available-border)';
  let color = 'var(--seat-available-text)';
  let extraClass = 'hover:-translate-y-0.5 cursor-pointer shadow-sm';

  if (isSelected) {
    bg = 'var(--seat-selected-bg)';
    border = 'var(--seat-selected-border)';
    color = 'var(--seat-selected-text)';
    extraClass = 'shadow-glow -translate-y-0.5 scale-105';
  } else if (isLocked) {
    bg = 'var(--seat-locked-bg)';
    border = 'var(--seat-locked-border)';
    color = 'var(--seat-locked-text)';
    extraClass = 'animate-seat-lock cursor-not-allowed';
  } else if (isBooked) {
    bg = 'var(--seat-booked-bg)';
    border = 'var(--seat-booked-border)';
    color = 'var(--seat-booked-text)';
    extraClass = 'cursor-not-allowed opacity-75';
  } else if (isFemale) {
    bg = 'var(--seat-female-bg)';
    border = 'var(--seat-female-border)';
    color = 'var(--seat-female-text)';
  }

  const handleClick = () => {
    if (disabled || isBooked || isLocked) return;
    onSelect(seat);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isBooked || isLocked}
      aria-label={`Seat ${seat.seatLabel} ${isSelected ? 'Selected' : seat.status}`}
      className={`relative w-11 h-12 rounded-xl border-2 flex flex-col items-center justify-center font-mono text-xs font-bold transition-all duration-200 select-none ${extraClass}`}
      style={{
        backgroundColor: bg,
        borderColor: border,
        color: color,
      }}
    >
      <span>{seat.seatLabel}</span>
      {/* Visual seat cushion accent */}
      <span
        className="w-6 h-1 rounded-full opacity-40 mt-0.5"
        style={{ backgroundColor: color }}
      />
    </button>
  );
}