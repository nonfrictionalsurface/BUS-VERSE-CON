'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useWsEvent } from '@/lib/ws/useWsEvent';
import { fetchLiveTripSnapshot } from '@/features/tickets/api/tickets.api';
import { LiveTripSnapshot } from '@/features/tickets/types';
import { LiveTelemetryHud } from '@/features/telemetry/components/LiveTelemetryHud';
import { TransitLoader } from '@/components/brand/TransitLoader';
import { ThemeToggle } from '@/lib/theme/ThemeToggle';
import { BusVerseLogo } from '@/components/brand/BusVerseLogo';
import { ArrowLeft, AlertCircle, Info, Smartphone } from 'lucide-react';

export default function LiveTripTrackingPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const resolvedParams = use(params);
  const tripId = resolvedParams.tripId;

  const [snapshot, setSnapshot] = useState<LiveTripSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSnapshot = async () => {
    try {
      const data = await fetchLiveTripSnapshot(tripId);
      setSnapshot(data);
      setErrorMsg(null);
    } catch {
      setErrorMsg('Live tracking is currently unavailable for this trip. It may not have started yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshot();

    // 3-second polling fallback if WebSocket is offline
    const pollTimer = setInterval(() => {
      fetchLiveTripSnapshot(tripId)
        .then((fresh) => {
          setSnapshot(fresh);
          setErrorMsg(null);
        })
        .catch(() => { /* ignore polling errors, rely on initial error */ });
    }, 3000);

    return () => clearInterval(pollTimer);
  }, [tripId]);

  // Real-time WebSocket: Subscribe to trip:live:{tripId}
  useWsEvent(`trip:live:${tripId}`, 'bus:position', (data: { lat: number; lng: number; speedKmh: number }) => {
    setSnapshot((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: 'IN_PROGRESS',
        gps: {
          lat: data.lat,
          lng: data.lng,
          speedKmh: data.speedKmh,
          recordedAt: new Date().toISOString(),
        },
      };
    });
  });

  useWsEvent(`trip:live:${tripId}`, 'trip:delayed', (data: { delayMinutes: number }) => {
    setSnapshot((prev) => (prev ? { ...prev, delayMinutes: data.delayMinutes } : null));
  });

  useWsEvent(`trip:live:${tripId}`, 'trip:ended', () => {
    setSnapshot((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <TransitLoader caption="SYNCHRONIZING VEHICLE TELEMETRY" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-20">
      <header className="sticky top-0 z-40 bg-surface-card/90 backdrop-blur-md border-b border-border-hairline shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 text-xs font-bold text-ink-secondary hover:text-brand-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>My Bookings</span>
          </Link>
          <div className="flex items-center gap-3">
            <BusVerseLogo size={32} variant="mark" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-4">
        
        {/* Disclaimer Banner */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-500 text-sm flex items-start gap-3">
          <Info size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Demo Environment Requirement</p>
            <p className="text-xs mt-1 text-amber-600/80">
              Live tracking requires a real driver streaming GPS. To see the map move, open the
              <strong> Operator App (Driver)</strong>, go to this trip, and click <strong>"Start Trip"</strong>.
            </p>
          </div>
        </div>

        {errorMsg && !snapshot ? (
          <div className="p-8 rounded-2xl bg-surface-card border border-border-hairline shadow-sm text-center">
            <div className="w-16 h-16 mx-auto bg-surface-sunken rounded-full flex items-center justify-center mb-4">
              <Smartphone className="w-8 h-8 text-ink-muted" />
            </div>
            <h3 className="text-lg font-bold text-ink-bright mb-2">Waiting for Driver</h3>
            <p className="text-sm text-ink-secondary mb-6 max-w-md mx-auto">
              {errorMsg}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-sunken text-xs font-mono text-ink-muted border border-border-subtle">
              <AlertCircle size={14} />
              Status: Awaiting Trip Start
            </div>
          </div>
        ) : snapshot ? (
          <LiveTelemetryHud snapshot={snapshot} />
        ) : null}
      </main>
    </div>
  );
}