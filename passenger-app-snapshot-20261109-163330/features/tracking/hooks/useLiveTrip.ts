import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWsEvent, useWsTopic } from '../../../lib/ws';
import type { BusPositionEvent, LiveTripDTO, MapDTO } from '../../../types';
import { getLiveTrip, getTripMap } from '../api/tracking.api';

/** Route + live state of a trip. Positions arrive over the socket; polling is only the fallback. */
export function useLiveTrip(tripId: string) {
  const qc = useQueryClient();
  const live = useQuery({ queryKey: ['trip-live', tripId], queryFn: () => getLiveTrip(tripId), refetchInterval: 20_000 });
  const map = useQuery({ queryKey: ['trip-map', tripId], queryFn: () => getTripMap(tripId), staleTime: 60_000 });

  useWsTopic(`trip:live:${tripId}`);

  const onPosition = useCallback(
    (data: Record<string, unknown>) => {
      const p = data as unknown as BusPositionEvent;
      if (p.tripId !== tripId) return;
      qc.setQueryData<LiveTripDTO>(['trip-live', tripId], (prev) =>
        prev
          ? {
              ...prev,
              currentPosition: { lat: p.lat, lng: p.lng, recordedAt: p.recordedAt },
              speedKmh: p.speedKmh,
              lastUpdatedAt: p.recordedAt,
              isStale: false,
              nextStandId: p.nextStandId,
            }
          : prev,
      );
      qc.setQueryData<MapDTO>(['trip-map', tripId], (prev) =>
        prev ? { ...prev, currentPosition: { lat: p.lat, lng: p.lng, recordedAt: p.recordedAt }, lastUpdatedAt: p.recordedAt } : prev,
      );
    },
    [qc, tripId],
  );
  const onTripChange = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['trip-live', tripId] });
  }, [qc, tripId]);

  useWsEvent('bus:position', onPosition);
  useWsEvent('trip:started', onTripChange);
  useWsEvent('trip:ended', onTripChange);
  useWsEvent('trip:cancelled', onTripChange);

  return { live, map };
}
