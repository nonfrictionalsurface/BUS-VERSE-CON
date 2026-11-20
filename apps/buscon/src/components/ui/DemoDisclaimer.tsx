'use client';

import { useState } from 'react';
import { Info, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Props {
  className?: string;
  compact?: boolean;
}

export function DemoDisclaimer({ className, compact }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-xl border-2 border-dashed',
        'bg-amber-500/10 border-amber-500/35',
        compact ? 'px-3 py-2' : 'px-4 py-3',
        className
      )}
    >
      <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
        <Sparkles size={compact ? 14 : 16} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Demo Data — Not Real Bookings
        </p>
        <p className="text-xs text-amber-700/90 dark:text-amber-200/80 mt-0.5">
          This dashboard shows sample data for demonstration only. Create a real bus and driver
          to track live activity.
        </p>
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip((v) => !v)}
          className="p-1.5 rounded-md text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
          aria-label="Why is this demo data?"
        >
          <Info size={16} />
        </button>

        {showTooltip && (
          <div
            role="tooltip"
            className="absolute right-0 top-full mt-2 w-60 z-50 p-3 rounded-lg bg-[#221C17] text-[#FAF6F0] border border-line-strong text-xs shadow-modal leading-relaxed"
          >
            Use a real operator or bus to track realtime info.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded text-amber-700/70 dark:text-amber-300/70 hover:text-amber-800 hover:bg-amber-500/15 transition-colors"
        aria-label="Dismiss disclaimer"
      >
        <X size={14} />
      </button>
    </div>
  );
}