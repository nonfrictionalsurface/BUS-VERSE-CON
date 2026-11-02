'use client';

import React, { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

interface LockCountdownProps {
  initialSeconds: number;
  onExpire: () => void;
}

export const LockCountdown: React.FC<LockCountdownProps> = ({ initialSeconds, onExpire }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onExpire]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-warning-amber/30 bg-warning-amber/10 px-3 py-1.5 text-warning-amber">
      <Timer className="h-4 w-4 animate-pulse" />
      <span className="font-mono text-xs font-bold">
        Lock reserved: {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
};
