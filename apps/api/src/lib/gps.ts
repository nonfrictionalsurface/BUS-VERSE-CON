// GPS provenance checks (buscon/04 §11, §12). Pure functions — no DB, no IO.

import { errors } from './errors.js';

export interface RawGpsSample {
  lat: number;
  lng: number;
  speedKmh: number;
  accuracyM: number;
  recordedAt: string;
}

export interface NormalizedSample {
  lat: number;
  lng: number;
  serverSpeedKmh: number | null;
  clientSpeedKmh: number;
  accuracyM: number;
  recordedAt: string;
  receivedAt: string;
  timestampDrift: boolean;
}

export type ProvenanceFlag = 'timestamp_drift' | 'speed_mismatch';

export interface ProvenanceInput {
  current: RawGpsSample;
  previous: NormalizedSample | null;
  receivedAt: Date;
  sessionDeviceHash: string | null;
  activeSessionDeviceHash: string | null;
}

export interface ProvenanceOutcome {
  accepted: boolean;
  flags: ProvenanceFlag[];
  sample: NormalizedSample | null;
  reason?: 'speed_mismatch' | 'fingerprint_mismatch';
}

// Limits per buscon/04 §3.4, §11.2, §12.4
export const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;
export const MAX_ACCURACY_M = 100;
export const MAX_TELEPORT_SPEED_KMH = 200;
export const MAX_SPEED_MISMATCH_KMH = 30;
export const ZERO_SPEED_KMH = 3;
export const ZERO_SPEED_RADIUS_KM = 0.02;
// ---------- Haversine + speed ----------

const EARTH_RADIUS_KM = 6371;
const toRad = (d: number): number => (d * Math.PI) / 180;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function computeSpeedKmh(
  prev: { lat: number; lng: number },
  curr: { lat: number; lng: number },
  deltaMs: number,
): number {
  if (deltaMs <= 0) return 0;
  const km = haversineKm(prev, curr);
  return km / (deltaMs / 3_600_000);
}
// ---------- Provenance checks (buscon/04 §11.2) ----------

export function checkTimestampWindow(
  recordedAt: string,
  receivedAt: Date,
): { effectiveRecordedAt: Date; drifted: boolean } {
  const rec = new Date(recordedAt);
  if (Number.isNaN(rec.getTime())) {
    return { effectiveRecordedAt: receivedAt, drifted: true };
  }
  const delta = Math.abs(receivedAt.getTime() - rec.getTime());
  if (delta > TIMESTAMP_WINDOW_MS) {
    return { effectiveRecordedAt: receivedAt, drifted: true };
  }
  return { effectiveRecordedAt: rec, drifted: false };
}

export function checkCoordinatePlausibility(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw errors.invalidCoordinates();
  if (lat < -90 || lat > 90) throw errors.invalidCoordinates();
  if (lng < -180 || lng > 180) throw errors.invalidCoordinates();
  if (lat === 0 && lng === 0) throw errors.invalidCoordinates();
}

export function checkAccuracy(accuracyM: number): void {
  if (!Number.isFinite(accuracyM) || accuracyM < 0) throw errors.invalidAccuracy();
  if (accuracyM > MAX_ACCURACY_M) throw errors.invalidAccuracy();
}
export function checkTeleport(
  prev: NormalizedSample | null,
  curr: { lat: number; lng: number; recordedAt: Date },
): void {
  if (!prev) return;
  const prevDate = new Date(prev.recordedAt);
  const deltaMs = curr.recordedAt.getTime() - prevDate.getTime();
  if (deltaMs <= 0) return;
  const impliedSpeed = computeSpeedKmh(prev, curr, deltaMs);
  if (impliedSpeed > MAX_TELEPORT_SPEED_KMH) throw errors.teleportDetected(impliedSpeed);
}

export function checkSpeedConsistency(
  serverSpeedKmh: number | null,
  clientSpeedKmh: number,
): boolean {
  if (serverSpeedKmh === null) return true;
  return Math.abs(serverSpeedKmh - clientSpeedKmh) <= MAX_SPEED_MISMATCH_KMH;
}

export function checkDeviceFingerprint(
  sessionDeviceHash: string | null,
  activeSessionDeviceHash: string | null,
): boolean {
  if (!sessionDeviceHash || !activeSessionDeviceHash) return true;
  return sessionDeviceHash === activeSessionDeviceHash;
}
// ---------- Orchestrator ----------

export function runProvenance(input: ProvenanceInput): ProvenanceOutcome {
  const flags: ProvenanceFlag[] = [];

  checkCoordinatePlausibility(input.current.lat, input.current.lng);
  checkAccuracy(input.current.accuracyM);

  const { effectiveRecordedAt, drifted } = checkTimestampWindow(
    input.current.recordedAt,
    input.receivedAt,
  );
  if (drifted) flags.push('timestamp_drift');

  checkTeleport(input.previous, {
    lat: input.current.lat,
    lng: input.current.lng,
    recordedAt: effectiveRecordedAt,
  });

  let serverSpeedKmh: number | null = null;
  if (input.previous) {
    const prevDate = new Date(input.previous.recordedAt);
    const deltaMs = effectiveRecordedAt.getTime() - prevDate.getTime();
    if (deltaMs > 0) {
      serverSpeedKmh = computeSpeedKmh(input.previous, input.current, deltaMs);
    }
  }

  if (!checkSpeedConsistency(serverSpeedKmh, input.current.speedKmh)) {
    flags.push('speed_mismatch');
    return { accepted: false, flags, sample: null, reason: 'speed_mismatch' };
  }

  if (!checkDeviceFingerprint(input.sessionDeviceHash, input.activeSessionDeviceHash)) {
    return { accepted: false, flags, sample: null, reason: 'fingerprint_mismatch' };
  }

  return {
    accepted: true,
    flags,
    sample: {
      lat: input.current.lat,
      lng: input.current.lng,
      serverSpeedKmh,
      clientSpeedKmh: input.current.speedKmh,
      accuracyM: input.current.accuracyM,
      recordedAt: effectiveRecordedAt.toISOString(),
      receivedAt: input.receivedAt.toISOString(),
      timestampDrift: drifted,
    },
  };
}