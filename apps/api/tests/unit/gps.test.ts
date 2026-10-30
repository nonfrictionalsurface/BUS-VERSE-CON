import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  computeSpeedKmh,
  checkTimestampWindow,
  checkCoordinatePlausibility,
  checkAccuracy,
  checkTeleport,
  checkSpeedConsistency,
  checkDeviceFingerprint,
  runProvenance,
  MAX_ACCURACY_M,
  MAX_TELEPORT_SPEED_KMH,
  MAX_SPEED_MISMATCH_KMH,
  TIMESTAMP_WINDOW_MS,
  type NormalizedSample,
} from '../../src/lib/gps.js';

function expectDomainError(fn: () => void, code: string): void {
  let caught: unknown;
  try { fn(); } catch (e) { caught = e; }
  expect(caught).toBeDefined();
  expect((caught as { code?: string }).code).toBe(code);
}

function mkPrev(overrides: Partial<NormalizedSample> = {}): NormalizedSample {
  return {
    lat: 28.6,
    lng: 77.2,
    serverSpeedKmh: 60,
    clientSpeedKmh: 60,
    accuracyM: 10,
    recordedAt: '2026-10-25T14:30:00.000Z',
    receivedAt: '2026-10-25T14:30:00.100Z',
    timestampDrift: false,
    ...overrides,
  };
}
describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm({ lat: 28.6, lng: 77.2 }, { lat: 28.6, lng: 77.2 })).toBeCloseTo(0, 5);
  });

  it('1 degree of latitude is about 111 km', () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });

  it('Delhi to Lucknow is roughly 420 km', () => {
    const d = haversineKm({ lat: 28.6139, lng: 77.209 }, { lat: 26.8467, lng: 80.9462 });
    expect(d).toBeGreaterThan(400);
    expect(d).toBeLessThan(450);
  });
});

describe('computeSpeedKmh', () => {
  it('1 km in 60 seconds is 60 km/h', () => {
    const speed = computeSpeedKmh({ lat: 0, lng: 0 }, { lat: 0.009, lng: 0 }, 60_000);
    expect(speed).toBeGreaterThan(58);
    expect(speed).toBeLessThan(62);
  });

  it('zero delta returns 0', () => {
    expect(computeSpeedKmh({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, 0)).toBe(0);
  });
});
describe('checkTimestampWindow', () => {
  it('within 5 min: no drift, keeps recordedAt', () => {
    const r = checkTimestampWindow('2026-10-25T14:30:00.000Z', new Date('2026-10-25T14:32:00.000Z'));
    expect(r.drifted).toBe(false);
    expect(r.effectiveRecordedAt.toISOString()).toBe('2026-10-25T14:30:00.000Z');
  });

  it('beyond 5 min: drift true, overrides with receivedAt', () => {
    const received = new Date('2026-10-25T14:30:00.000Z');
    const r = checkTimestampWindow('2026-10-25T14:00:00.000Z', received);
    expect(r.drifted).toBe(true);
    expect(r.effectiveRecordedAt.getTime()).toBe(received.getTime());
  });

  it('unparseable: drift true, overrides with receivedAt', () => {
    const received = new Date('2026-10-25T14:30:00.000Z');
    const r = checkTimestampWindow('not-a-date', received);
    expect(r.drifted).toBe(true);
    expect(r.effectiveRecordedAt.getTime()).toBe(received.getTime());
  });
});

describe('checkCoordinatePlausibility', () => {
  it('valid coords do not throw', () => {
    expect(() => checkCoordinatePlausibility(28.6, 77.2)).not.toThrow();
  });

  it('latitude out of range throws INVALID_COORDINATES', () => {
    expectDomainError(() => checkCoordinatePlausibility(91, 0), 'INVALID_COORDINATES');
  });

  it('longitude out of range throws INVALID_COORDINATES', () => {
    expectDomainError(() => checkCoordinatePlausibility(0, 181), 'INVALID_COORDINATES');
  });

  it('(0,0) throws INVALID_COORDINATES', () => {
    expectDomainError(() => checkCoordinatePlausibility(0, 0), 'INVALID_COORDINATES');
  });

  it('NaN throws INVALID_COORDINATES', () => {
    expectDomainError(() => checkCoordinatePlausibility(NaN, 0), 'INVALID_COORDINATES');
  });
});
describe('checkAccuracy', () => {
  it('accuracy within 100m passes', () => {
    expect(() => checkAccuracy(50)).not.toThrow();
  });

  it('accuracy over 100m throws INVALID_ACCURACY', () => {
    expectDomainError(() => checkAccuracy(MAX_ACCURACY_M + 1), 'INVALID_ACCURACY');
  });

  it('negative accuracy throws INVALID_ACCURACY', () => {
    expectDomainError(() => checkAccuracy(-1), 'INVALID_ACCURACY');
  });
});

describe('checkTeleport', () => {
  it('null previous sample is a no-op', () => {
    expect(() => checkTeleport(null, { lat: 0, lng: 0, recordedAt: new Date() })).not.toThrow();
  });

  it('plausible jump under 200 km/h does not throw', () => {
    const prev = mkPrev({ lat: 28.6, lng: 77.2, recordedAt: '2026-10-25T14:30:00.000Z' });
    // ~1 km jump over 60s = ~60 km/h
    expect(() => checkTeleport(prev, { lat: 28.61, lng: 77.2, recordedAt: new Date('2026-10-25T14:31:00.000Z') })).not.toThrow();
  });

  it('implied speed over 200 km/h throws TELEPORT_DETECTED', () => {
    const prev = mkPrev({ lat: 28.6, lng: 77.2, recordedAt: '2026-10-25T14:30:00.000Z' });
    // ~5 km jump over 5s = ~3600 km/h
    expectDomainError(
      () => checkTeleport(prev, { lat: 28.65, lng: 77.2, recordedAt: new Date('2026-10-25T14:30:05.000Z') }),
      'TELEPORT_DETECTED',
    );
  });
});

describe('checkSpeedConsistency', () => {
  it('within 30 km/h passes', () => {
    expect(checkSpeedConsistency(60, 60 + MAX_SPEED_MISMATCH_KMH - 1)).toBe(true);
  });

  it('over 30 km/h mismatch fails', () => {
    expect(checkSpeedConsistency(60, 60 + MAX_SPEED_MISMATCH_KMH + 1)).toBe(false);
  });

  it('null server speed passes (first sample)', () => {
    expect(checkSpeedConsistency(null, 120)).toBe(true);
  });
});

describe('checkDeviceFingerprint', () => {
  it('both null passes (lenient)', () => {
    expect(checkDeviceFingerprint(null, null)).toBe(true);
  });

  it('matching hashes pass', () => {
    expect(checkDeviceFingerprint('abc123', 'abc123')).toBe(true);
  });

  it('mismatched hashes fail', () => {
    expect(checkDeviceFingerprint('abc123', 'xyz789')).toBe(false);
  });
});
describe('runProvenance', () => {
  it('first sample: accepts, serverSpeedKmh null', () => {
    const r = runProvenance({
      current: { lat: 28.6, lng: 77.2, speedKmh: 60, accuracyM: 10, recordedAt: '2026-10-25T14:30:00.000Z' },
      previous: null,
      receivedAt: new Date('2026-10-25T14:30:00.100Z'),
      sessionDeviceHash: null,
      activeSessionDeviceHash: null,
    });
    expect(r.accepted).toBe(true);
    expect(r.flags).toEqual([]);
    expect(r.sample?.serverSpeedKmh).toBeNull();
    expect(r.sample?.clientSpeedKmh).toBe(60);
  });

  it('second sample: computes serverSpeedKmh from distance', () => {
    const prev = mkPrev();
    const r = runProvenance({
      current: { lat: 28.61, lng: 77.2, speedKmh: 60, accuracyM: 10, recordedAt: '2026-10-25T14:31:00.000Z' },
      previous: prev,
      receivedAt: new Date('2026-10-25T14:31:00.100Z'),
      sessionDeviceHash: null,
      activeSessionDeviceHash: null,
    });
    expect(r.accepted).toBe(true);
    expect(r.sample?.serverSpeedKmh).toBeGreaterThan(50);
    expect(r.sample?.serverSpeedKmh).toBeLessThan(70);
  });

  it('bad coords: throws INVALID_COORDINATES', () => {
    expectDomainError(
      () => runProvenance({
        current: { lat: 91, lng: 77.2, speedKmh: 60, accuracyM: 10, recordedAt: '2026-10-25T14:30:00.000Z' },
        previous: null,
        receivedAt: new Date(),
        sessionDeviceHash: null,
        activeSessionDeviceHash: null,
      }),
      'INVALID_COORDINATES',
    );
  });

  it('bad accuracy: throws INVALID_ACCURACY', () => {
    expectDomainError(
      () => runProvenance({
        current: { lat: 28.6, lng: 77.2, speedKmh: 60, accuracyM: 500, recordedAt: '2026-10-25T14:30:00.000Z' },
        previous: null,
        receivedAt: new Date(),
        sessionDeviceHash: null,
        activeSessionDeviceHash: null,
      }),
      'INVALID_ACCURACY',
    );
  });

  it('teleport: throws TELEPORT_DETECTED', () => {
    const prev = mkPrev({ lat: 28.6, lng: 77.2, recordedAt: '2026-10-25T14:30:00.000Z' });
    expectDomainError(
      () => runProvenance({
        current: { lat: 28.65, lng: 77.2, speedKmh: 60, accuracyM: 10, recordedAt: '2026-10-25T14:30:05.000Z' },
        previous: prev,
        receivedAt: new Date('2026-10-25T14:30:05.100Z'),
        sessionDeviceHash: null,
        activeSessionDeviceHash: null,
      }),
      'TELEPORT_DETECTED',
    );
  });

  it('speed mismatch: silent drop with flag', () => {
    const prev = mkPrev();
    const r = runProvenance({
      current: { lat: 28.61, lng: 77.2, speedKmh: 200, accuracyM: 10, recordedAt: '2026-10-25T14:31:00.000Z' },
      previous: prev,
      receivedAt: new Date('2026-10-25T14:31:00.100Z'),
      sessionDeviceHash: null,
      activeSessionDeviceHash: null,
    });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('speed_mismatch');
    expect(r.flags).toContain('speed_mismatch');
  });

  it('fingerprint mismatch: silent drop', () => {
    const r = runProvenance({
      current: { lat: 28.6, lng: 77.2, speedKmh: 60, accuracyM: 10, recordedAt: '2026-10-25T14:30:00.000Z' },
      previous: null,
      receivedAt: new Date('2026-10-25T14:30:00.100Z'),
      sessionDeviceHash: 'session-hash',
      activeSessionDeviceHash: 'different-hash',
    });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('fingerprint_mismatch');
  });

  it('timestamp drift: accepts with flag', () => {
    const r = runProvenance({
      current: { lat: 28.6, lng: 77.2, speedKmh: 60, accuracyM: 10, recordedAt: '2026-10-25T14:00:00.000Z' },
      previous: null,
      receivedAt: new Date('2026-10-25T14:30:00.000Z'),
      sessionDeviceHash: null,
      activeSessionDeviceHash: null,
    });
    expect(r.accepted).toBe(true);
    expect(r.flags).toContain('timestamp_drift');
    expect(r.sample?.timestampDrift).toBe(true);
    expect(r.sample?.recordedAt).toBe('2026-10-25T14:30:00.000Z');
  });
});