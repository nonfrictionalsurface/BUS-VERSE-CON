'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Server, RefreshCw, ArrowRight, Clock } from 'lucide-react';
import { BusConLogo } from '@/components/brand/BusConLogo';
import { TransitLoader } from '@/lib/brand';
import { Button } from '@/components/ui/Button';
import { CONFIG } from '@/lib/config';

const PROBE_TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 1500;
const WARM_GRACE_MS = 450;

async function pingBackend(signal: AbortSignal): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  const onParentAbort = () => controller.abort();
  signal.addEventListener('abort', onParentAbort);

  try {
    const res = await fetch(`${CONFIG.API_BASE}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    // Any non-5xx response (e.g. 200 or 404) confirms the Fastify server on Render is awake
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', onParentAbort);
  }
}

export function BackendWakeGate({ children }: { children: React.ReactNode }) {
  const [isAwake, setIsAwake] = useState(false);
  const [showWakeScreen, setShowWakeScreen] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [isProbing, setIsProbing] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runProbeLoop = useCallback(async () => {
    abortRef.current?.abort();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

    const controller = new AbortController();
    abortRef.current = controller;

    while (!controller.signal.aborted) {
      setIsProbing(true);
      const ok = await pingBackend(controller.signal);
      if (controller.signal.aborted) return;

      setIsProbing(false);
      if (ok) {
        setIsAwake(true);
        return;
      }

      setAttempt((prev) => prev + 1);
      await new Promise<void>((resolve) => {
        retryTimerRef.current = setTimeout(resolve, RETRY_DELAY_MS);
      });
    }
  }, []);

  useEffect(() => {
    const graceTimer = setTimeout(() => {
      setShowWakeScreen(true);
    }, WARM_GRACE_MS);

    const elapsedTimer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    runProbeLoop();

    return () => {
      clearTimeout(graceTimer);
      clearInterval(elapsedTimer);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      abortRef.current?.abort();
    };
  }, [runProbeLoop]);

  if (isAwake) {
    return <>{children}</>;
  }

  // Avoid flashing the waking screen if the backend responds within 450ms
  if (!showWakeScreen) {
    return <div className="min-h-screen bg-canvas-bg" />;
  }

  // Asymptotic progress bar tailored for Render's ~30-50s cold-start window
  const progressPct = Math.min(92, Math.round((1 - Math.exp(-elapsedSec / 18)) * 95));

  const stageLabel =
    elapsedSec < 8
      ? 'Pinging Render backend instance…'
      : elapsedSec < 22
      ? 'Spinning up API container & database pool…'
      : 'Finalizing server boot — almost ready…';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas-bg px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-line-hairline bg-surface-card p-6 sm:p-8 shadow-floating text-center space-y-6">
        <div className="flex justify-center">
          <BusConLogo size={36} />
        </div>

        <div className="flex justify-center py-1">
          <TransitLoader size="md" caption="WAKING SERVER" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand-text text-xs font-semibold">
            <Server size={13} />
            <span>Render Cold-Start Wakeup</span>
          </div>
          <h1 className="text-xl font-bold text-ink-bright tracking-tight">
            Waking up the BusCon server
          </h1>
          <p className="text-sm text-ink-secondary leading-relaxed">
            Our backend runs on Render and sleeps after inactivity. Cold starts typically take{' '}
            <strong className="text-ink-primary">30–50 seconds</strong>. You will be redirected
            automatically once it responds.
          </p>
        </div>

        {/* Progress & Status */}
        <div className="space-y-2 text-left bg-surface-sunken p-3.5 rounded-xl border border-line-hairline">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-primary">{stageLabel}</span>
            <span className="font-mono text-ink-muted flex items-center gap-1 shrink-0">
              <Clock size={12} /> {elapsedSec}s
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-surface-card overflow-hidden border border-line-hairline">
            <div
              className="h-full bg-brand transition-all duration-700 ease-out rounded-full"
              style={{ width: `${Math.max(8, progressPct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-ink-muted">
            <span>Health check attempt #{attempt}</span>
            <span>{isProbing ? 'Checking…' : 'Retrying shortly…'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => runProbeLoop()}
          >
            <RefreshCw size={14} className={isProbing ? 'animate-spin' : ''} />
            Retry now
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => setIsAwake(true)}
          >
            Skip &amp; continue <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}