'use client';

import type { Seat } from '@/features/seats/api/seats.api';

interface SeatCellProps {
  seat: Seat;
  isSelectedByMe: boolean;
  onToggle: (seat: Seat) => void;
  disabled?: boolean;
}

export function SeatCell({ seat, isSelectedByMe, onToggle, disabled = false }: SeatCellProps) {
  // ⭐ Read `.status` — the field our API mapper produces. Never `.state`.
  const isBooked = seat.status === 'BOOKED';
  const isLockedByOther = seat.status === 'LOCKED' && !isSelectedByMe;
  const isInactive = isBooked || isLockedByOther || disabled;

  let cls =
    'bg-[var(--seat-available-bg)] border-[var(--seat-available-border)] text-[var(--seat-available-text)]';

  if (isBooked) {
    cls =
      'bg-[var(--seat-booked-bg)] border-[var(--seat-booked-border)] text-[var(--seat-booked-text)] cursor-not-allowed';
  } else if (isSelectedByMe) {
    cls =
      'bg-[var(--seat-selected-bg)] border-[var(--seat-selected-border)] text-[var(--seat-selected-text)] -translate-y-0.5';
  } else if (isLockedByOther) {
    cls =
      'bg-[var(--seat-locked-bg)] border-[var(--seat-locked-border)] text-[var(--seat-locked-text)] cursor-not-allowed animate-pulse';
  } else if (seat.isFemaleOnly) {
    cls =
      'bg-[var(--seat-female-bg)] border-[var(--seat-female-border)] text-[var(--seat-female-text)]';
  }

  const height =
    seat.seatType === 'SLEEPER'
      ? 'h-16'
      : seat.seatType === 'SEMI_SLEEPER'
      ? 'h-14'
      : 'h-11';

  const ariaStatus =
    isBooked ? 'booked' :
    isLockedByOther ? 'locked by another user' :
    isSelectedByMe ? 'selected by you' :
    'available';

  return (
    <button
      type="button"
      disabled={isInactive}
      onClick={() => onToggle(seat)}
      aria-pressed={isSelectedByMe}
      aria-label={`Seat ${seat.seatLabel}, ${ariaStatus}${seat.isFemaleOnly ? ', female preferred' : ''}`}
      title={`${seat.seatLabel} · ${ariaStatus}${seat.isFemaleOnly ? ' · female only' : ''}`}
      className={`relative flex w-10 ${height} flex-col items-center justify-center rounded-lg border-2 font-mono text-[11px] font-bold transition-all ${cls}`}
    >
      <span>{seat.seatLabel}</span>
      <div className="absolute bottom-1 h-0.5 w-6 rounded bg-black/20 dark:bg-white/20" />
    </button>
  );
}