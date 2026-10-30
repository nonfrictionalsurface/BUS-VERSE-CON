'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Info, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function DemoDisclaimer({ className }: { className?: string }) {
  const pathname = usePathname();
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only render on booking-related routes — not on the home/search page
  const isBookingRoute =
    pathname.startsWith('/schedule/') ||
    pathname.startsWith('/book/') ||
    pathname.startsWith('/pay/');

  if (!isBookingRoute || dismissed) return null;

  return (
    <div
      className={cn(
        'relative flex items-center justify-between gap-3 w-full px-4 py-2 border-b',
        'bg-amber-500/10 border-amber-500/20 text-amber-600',
        className
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <Sparkles size={16} className="shrink-0" />
        <p className="text-xs sm:text-sm font-medium truncate">
          <strong>Demo Environment:</strong> This is sample data. Real bookings require a live operator.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip((v) => !v)}
            className="p-1 rounded hover:bg-amber-500/20 transition-colors"
            aria-label="More info"
          >
            <Info size={16} />
          </button>
          {showTooltip && (
            <div
              role="tooltip"
              className="absolute right-0 top-full mt-2 w-56 z-50 p-3 rounded-lg bg-ink-bright text-white text-xs shadow-modal leading-relaxed"
            >
              Use a real operator or bus to track realtime info.
              <div className="absolute right-3 bottom-full w-2 h-2 bg-ink-bright rotate-45" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-amber-500/20 transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}