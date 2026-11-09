'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAccessToken } from '@/lib/api/client';
import { connectSocket, subscribe, unsubscribe } from '@/lib/ws/socket';
import { useWsEvent } from '@/lib/ws/useWsEvent';
import { LiveMap } from '@/components/tracking/LiveMap';

interface BusPosition {
  lat: number;
  lng: number;
  speedKmh: number;
  recordedAt: string;
  nextStandId?: string;
  etaMinutes?: number;
}

interface TripStatus {
  tripId: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  lastPosition?: BusPosition;
  stops?: Array<{ lat: number; lng: number; name: string }>;
  boardedCount?: number;
  totalCount?: number;
}

export default function LiveTrackingPage() {
  const router = useRouter();
  const params = useParams<{ tripId: string }>();
  const tripId = params?.tripId;
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [busPosition, setBusPosition] = useState<BusPosition | null>(null);
  const [tripState, setTripState] = useState<'UNKNOWN' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>('UNKNOWN');
  const [stops, setStops] = useState<Array<{ lat: number; lng: number; name: string }>>([]);
  const [wsReady, setWsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateAt, setLastUpdateAt] = useState<Date | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/trips/${tripId}/live`)}`);
    }
  }, [authLoading, isAuthenticated, tripId, router]);

  // Connect WS + subscribe
  useEffect(() => {
    if (!isAuthenticated || !tripId) return;
    const token = getAccessToken();
    if (!token) {
      setError('Not logged in');
      return;
    }

    const socket = connectSocket(token);
    const topic = `trip:live:${tripId}`;

    const onAuthOk = () => {
      subscribe([topic]);
      setWsReady(true);
      console.log('[live] subscribed to', topic);
    };

    if (socket.connected) {
      subscribe([topic]);
      setWsReady(true);
    } else {
      socket.once('auth:ok', onAuthOk);
    }

    // Initial state fetch (in case we missed events)
    (async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE ?? '/api/v1'}/passenger/trips/${tripId}/live`,
          { headers: { Authorization: 'Bearer ' + token } },
        );
        if (res.ok) {
          const body = await res.json();
          const data = body?.data ?? body;
          if (data?.status) setTripState(data.status);
          if (data?.currentPosition) {
            setBusPosition({
              lat: data.currentPosition.lat,
              lng: data.currentPosition.lng,
              speedKmh: data.speedKmh ?? 0,
              recordedAt: data.currentPosition.recordedAt ?? new Date().toISOString(),
              nextStandId: data.nextStandId,
            });
            setLastUpdateAt(new Date());
          }
          if (Array.isArray(data?.stops)) setStops(data.stops);
        }
      } catch (err) {
        console.warn('[live] initial fetch failed:', err);
      }
    })();

    return () => {
      unsubscribe([topic]);
      socket.off('auth:ok', onAuthOk);
    };
  }, [isAuthenticated, tripId]);

  // Handle WS events
  useWsEvent<BusPosition>(`trip:live:${tripId}`, 'bus:position', (data) => {
    console.log('[live] bus:position', data);
    setBusPosition(data);
    setLastUpdateAt(new Date());
    setTripState((s) => (s === 'IN_PROGRESS' ? s : 'IN_PROGRESS'));
  }, wsReady);

  useWsEvent(`trip:live:${tripId}`, 'trip:started', () => {
    console.log('[live] trip:started');
    setTripState('IN_PROGRESS');
  }, wsReady);

  useWsEvent(`trip:live:${tripId}`, 'trip:delayed', (data: any) => {
    console.log('[live] trip:delayed', data);
    setError(`Driver reports delay: ${data?.reason ?? 'delayed'}`);
  }, wsReady);

  useWsEvent(`trip:live:${tripId}`, 'trip:ended', () => {
    console.log('[live] trip:ended');
    setTripState('COMPLETED');
  }, wsReady);

  useWsEvent(`trip:live:${tripId}`, 'trip:cancelled', (data: any) => {
    console.log('[live] trip:cancelled', data);
    setTripState('CANCELLED');
  }, wsReady);

  const isStale = useMemo(() => {
    if (!lastUpdateAt) return false;
    return Date.now() - lastUpdateAt.getTime() > 30_000;
  }, [lastUpdateAt, busPosition]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="inline-block w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const defaultLat = busPosition?.lat ?? (stops[0]?.lat ?? 28.6139);
  const defaultLng = busPosition?.lng ?? (stops[0]?.lng ?? 77.2090);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="border-b border-border-hairline bg-surface sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/bookings" className="text-sm text-text-secondary hover:text-text-primary">
            ← My trips
          </Link>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                tripState === 'IN_PROGRESS' && !isStale
                  ? 'bg-[var(--signal-emerald-subtle)] text-[var(--signal-emerald)] border-[var(--signal-emerald)]'
                  : isStale
                  ? 'bg-[var(--warning-amber-subtle)] text-[var(--warning-amber)] border-[var(--warning-amber)]'
                  : 'bg-[var(--surface-sunken)] text-text-muted border-border-subtle'
              }`}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                tripState === 'IN_PROGRESS' && !isStale ? 'bg-[var(--signal-emerald)] animate-pulse' : isStale ? 'bg-[var(--warning-amber)]' : 'bg-text-muted'
              }`} />
              {tripState === 'IN_PROGRESS' && !isStale ? 'Live' :
               isStale ? 'Stale' :
               tripState === 'SCHEDULED' ? 'Waiting' :
               tripState === 'COMPLETED' ? 'Completed' :
               tripState === 'CANCELLED' ? 'Cancelled' :
               'Connecting'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-8">
        <div className="max-w-lg mx-auto px-4 py-4">
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-[var(--warning-amber-subtle)] border border-[var(--warning-amber)] text-sm text-[var(--warning-amber)]">
              {error}
            </div>
          )}

          {/* Map */}
          <LiveMap
            lat={defaultLat}
            lng={defaultLng}
            stops={stops}
            height={380}
          />

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-4 bg-surface border border-border-hairline rounded-lg">
              <p className="text-[10px] font-mono uppercase text-text-muted">Speed</p>
              <p className="text-2xl font-extrabold font-mono text-text-bright mt-1">
                {busPosition?.speedKmh != null ? Math.round(busPosition.speedKmh) : '—'}
                <span className="text-sm text-text-muted ml-1">km/h</span>
              </p>
            </div>
            <div className="p-4 bg-surface border border-border-hairline rounded-lg">
              <p className="text-[10px] font-mono uppercase text-text-muted">Last update</p>
              <p className="text-sm font-bold text-text-bright mt-2">
                {lastUpdateAt
                  ? `${Math.round((Date.now() - lastUpdateAt.getTime()) / 1000)}s ago`
                  : 'Waiting…'}
              </p>
            </div>
          </div>

          {/* ETA */}
          {busPosition?.nextStandId && (
            <div className="mt-3 p-4 bg-surface border border-border-hairline rounded-lg">
              <p className="text-[10px] font-mono uppercase text-text-muted">Next stand ETA</p>
              <p className="text-sm font-bold text-text-bright mt-1">
                {busPosition.etaMinutes != null
                  ? `${busPosition.etaMinutes} min`
                  : 'Calculating…'}
              </p>
            </div>
          )}

          {/* Status explainer */}
          {tripState === 'SCHEDULED' && (
            <div className="mt-4 p-4 bg-surface border border-border-hairline rounded-lg text-center">
              <p className="text-sm text-text-secondary">
                Waiting for the driver to start the trip.
              </p>
              <p className="text-xs text-text-muted mt-1">
                Live position will appear once the bus departs.
              </p>
            </div>
          )}

          {tripState === 'COMPLETED' && (
            <div className="mt-4 p-4 bg-surface border border-border-hairline rounded-lg text-center">
              <p className="text-sm text-text-secondary">Trip completed.</p>
            </div>
          )}

          {tripState === 'CANCELLED' && (
            <div className="mt-4 p-4 bg-[var(--danger-crimson-subtle)] border border-[var(--danger-crimson)] rounded-lg text-center">
              <p className="text-sm font-semibold text-[var(--danger-crimson)]">
                Trip was cancelled by the operator.
              </p>
              <p className="text-xs text-text-muted mt-1">A full refund has been initiated.</p>
            </div>
          )}

          <p className="text-[10px] text-text-muted text-center mt-6">
            Updates stream every 5 seconds via WebSocket
          </p>
        </div>
      </main>
    </div>
  );
}