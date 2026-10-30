// ETA computation (buscon/04 §16). Pure functions — no DB, no IO.

import { haversineKm } from './gps.js';

export interface EtaSample {
  lat: number;
  lng: number;
  recordedAt: Date | string;
}

export interface RouteStandInput {
  standId: string;
  standName: string;
  sequence: number;
  distanceFromPrevKm: number;
}

export interface EtaResult {
  standId: string;
  standName: string;
  etaMinutes: number;
}

export interface EtaContext {
  samples: EtaSample[];
  routeStands: RouteStandInput[];
  now: Date;
}

export interface EtaOutcome {
  eta: EtaResult[];
  nextStandId: string | null;
  nextEtaMinutes: number | null;
  avgSpeedKmh: number;
}

// Limits per buscon/04 §16.4, §16.6
export const ETA_AVG_SPEED_WINDOW_MS = 5 * 60 * 1000;
export const ETA_MIN_SPEED_KMH = 5;
export const ETA_ZERO_SPEED_CAP_MIN = 120;

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}
// ---------- Avg speed + trip distance ----------

export function computeAvgSpeedKmh(samples: EtaSample[], now: Date): number {
  if (samples.length < 2) return 0;

  const cutoff = now.getTime() - ETA_AVG_SPEED_WINDOW_MS;
  let windowed = samples.filter((s) => toDate(s.recordedAt).getTime() >= cutoff);
  if (windowed.length < 2) windowed = samples;

  let km = 0;
  for (let i = 1; i < windowed.length; i++) {
    km += haversineKm(windowed[i - 1]!, windowed[i]!);
  }
  const t0 = toDate(windowed[0]!.recordedAt).getTime();
  const t1 = toDate(windowed[windowed.length - 1]!.recordedAt).getTime();
  const hours = (t1 - t0) / 3_600_000;
  if (hours <= 0) return 0;
  return km / hours;
}

export function computeTripDistanceKm(samples: EtaSample[]): number {
  if (samples.length < 2) return 0;
  let km = 0;
  for (let i = 1; i < samples.length; i++) {
    km += haversineKm(samples[i - 1]!, samples[i]!);
  }
  return km;
}
// ---------- Next stand + ETA ----------

export function computeNextStandIndex(
  routeStands: RouteStandInput[],
  tripDistanceKm: number,
): number {
  if (routeStands.length < 2) return -1;
  let cumulative = routeStands[0]!.distanceFromPrevKm;
  for (let i = 1; i < routeStands.length; i++) {
    cumulative += routeStands[i]!.distanceFromPrevKm;
    if (cumulative >= tripDistanceKm) return i;
  }
  return -1;
}

export function computeEta(ctx: EtaContext): EtaOutcome {
  // buscon/04 §8B.6: no GPS samples yet — return empty ETA, no next stand
  if (ctx.samples.length === 0) {
    return { eta: [], nextStandId: null, nextEtaMinutes: null, avgSpeedKmh: 0 };
  }

  const avgSpeedKmh = computeAvgSpeedKmh(ctx.samples, ctx.now);
  const tripDistanceKm = computeTripDistanceKm(ctx.samples);
  const nextIdx = computeNextStandIndex(ctx.routeStands, tripDistanceKm);

  if (nextIdx < 0) {
    return { eta: [], nextStandId: null, nextEtaMinutes: null, avgSpeedKmh };
  }

  const effectiveSpeed =
    avgSpeedKmh < ETA_MIN_SPEED_KMH ? ETA_MIN_SPEED_KMH : avgSpeedKmh;

  const eta: EtaResult[] = [];
  let remainingKm = 0;
  for (let i = nextIdx; i < ctx.routeStands.length; i++) {
    remainingKm += ctx.routeStands[i]!.distanceFromPrevKm;
    const raw = Math.ceil((remainingKm / effectiveSpeed) * 60);
    const capped = Math.min(raw, ETA_ZERO_SPEED_CAP_MIN);
    eta.push({
      standId: ctx.routeStands[i]!.standId,
      standName: ctx.routeStands[i]!.standName,
      etaMinutes: capped,
    });
  }

  return {
    eta,
    nextStandId: eta[0]!.standId,
    nextEtaMinutes: eta[0]!.etaMinutes,
    avgSpeedKmh,
  };
}