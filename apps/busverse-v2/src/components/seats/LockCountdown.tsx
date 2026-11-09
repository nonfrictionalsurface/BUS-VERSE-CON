'use client';

import { useEffect, useState } from 'react';

interface LockCountdownProps {
  expiresAt: string;
  onExpire: () => void;
}

export function LockCountdown({ expiresAt, onExpire }: LockCountdownProps) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    let fired = false;
    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(Math.max(0, ms));
      if (ms <= 0 && !fired) {
        fired = true;
        onExpire();
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const totalSec = Math.floor(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');

  let color = 'text-text-secondary';
  if (remainingMs < 60_000) color = 'text-[var(--warning-amber)]';
  if (remainingMs < 30_000) color = 'text-[var(--danger-crimson)]';

  return (
    <p className={`text-center font-mono text-sm font-bold ${color}`} role="timer" aria-live="polite">
      ⏱ {mm}:{ss} left to complete
    </p>
  );
}