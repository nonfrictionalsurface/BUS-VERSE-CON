'use client';

import React, { useEffect, useState } from 'react';
import { formatCountdown } from '@/lib/utils/formatters';
import { Clock, AlertTriangle } from 'lucide-react';

interface LockCountdownProps {
  expiresAt: string; // ISO 8601 UTC
  onExpire: () => void;
}

export function LockCountdown({ expiresAt, onExpire }: LockCountdownProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const isCritical = remainingSeconds <= 60;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
        isCritical
          ? 'bg-danger-subtle border-danger-crimson text-danger-crimson animate-pulse'
          : 'bg-warning-subtle border-warning-amber text-warning-amber'
      }`}
    >
      {isCritical ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
      <span>Seat Locked: {formatCountdown(remainingSeconds)}</span>
    </div>
  );
}