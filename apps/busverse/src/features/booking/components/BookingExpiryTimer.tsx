'use client';

import React, { useEffect, useState } from 'react';
import { formatCountdown } from '@/lib/utils/formatters';
import { Clock, AlertTriangle } from 'lucide-react';

interface BookingExpiryTimerProps {
  expiresAt: string; // Server UTC ISO string
  onExpire: () => void;
  className?: string;
}

/**
 * 15-Minute Authoritative Server Expiration Countdown
 * Rule 8.4: Computed strictly from database expiresAt (never client time delta)
 */
export function BookingExpiryTimer({ expiresAt, onExpire, className = '' }: BookingExpiryTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const isUrgent = secondsRemaining <= 180; // Under 3 mins remaining

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
        isUrgent
          ? 'bg-danger-subtle border-danger-crimson text-danger-crimson animate-pulse'
          : 'bg-warning-subtle border-warning-amber text-warning-amber'
      } ${className}`}
    >
      {isUrgent ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
      <span>Booking Window: {formatCountdown(secondsRemaining)}</span>
    </div>
  );
}