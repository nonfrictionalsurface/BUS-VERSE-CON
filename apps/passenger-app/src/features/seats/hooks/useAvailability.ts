import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fromLegacy,
  hasErrors,
  parseLayout,
  validateLayout,
  type Layout,
  type RuntimeMap,
  type SeatRuntime,
} from '@busverse/seat-engine';
import type { AvailabilityDTO, AvailabilitySeatDTO } from '../../../types';
import { getAvailability } from '../api/seats.api';

export interface SeatIndex {
  byId: Map<string, AvailabilitySeatDTO>;
  byKey: Map<string, AvailabilitySeatDTO>;
}

const keyOf = (s: AvailabilitySeatDTO): string => s.key ?? s.label;

/**
 * The layout the server sent (v2 spec), or the legacy rows upgraded losslessly.
 * Never a made-up layout: if neither is usable the screen shows an error instead of a fake bus.
 */
export function layoutFromAvailability(data: AvailabilityDTO): Layout | null {
  const parsed = parseLayout(data.layout.spec);
  if (parsed.layout) return parsed.layout;
  const legacy = fromLegacy({
    rowsCount: data.layout.rowsCount,
    columnsCount: data.layout.columnsCount,
    seats: data.seats.map((s) => ({
      seatRow: s.row,
      seatColumn: s.column,
      seatLabel: s.label,
      seatType: s.type,
      isFemaleOnly: s.isFemaleOnly,
      key: keyOf(s),
    })),
  });
  return hasErrors(validateLayout(legacy, { access: 'off' })) ? null : legacy;
}

export function useAvailability(scheduleId: string, enabled = true) {
  const query = useQuery({
    queryKey: ['availability', scheduleId],
    queryFn: () => getAvailability(scheduleId),
    enabled: enabled && !!scheduleId,
    staleTime: 15_000,
    refetchInterval: 60_000, // safety net when the socket is down
    refetchOnReconnect: true,
    retry: 1,
  });
  const data = query.data;
  const rev = data?.layout.rev ?? 0;
  const seatCount = data?.seats.length ?? 0;

  // Geometry only changes when the layout revision changes, not on every seat lock.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => (data ? layoutFromAvailability(data) : null), [rev, seatCount, scheduleId]);

  const index = useMemo<SeatIndex>(() => {
    const byId = new Map<string, AvailabilitySeatDTO>();
    const byKey = new Map<string, AvailabilitySeatDTO>();
    for (const s of data?.seats ?? []) {
      byId.set(s.id, s);
      byKey.set(keyOf(s), s);
    }
    return { byId, byKey };
  }, [data?.seats]);

  const runtime = useMemo<RuntimeMap>(() => {
    const out: Record<string, SeatRuntime> = {};
    for (const s of data?.seats ?? []) out[keyOf(s)] = { status: s.state, lockedUntil: s.lockedUntil };
    return out;
  }, [data?.seats]);

  return { ...query, layout, index, runtime };
}
