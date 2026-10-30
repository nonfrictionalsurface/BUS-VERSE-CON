import { describe, it, expect } from 'vitest';
import {
  computeAvgSpeedKmh,
  computeTripDistanceKm,
  computeNextStandIndex,
  computeEta,
  ETA_AVG_SPEED_WINDOW_MS,
  ETA_MIN_SPEED_KMH,
  ETA_ZERO_SPEED_CAP_MIN,
  type EtaSample,
  type RouteStandInput,
} from '../../src/lib/eta.js';

// Helper: sample at lat 0.00 → 0.01 → 0.02 (~1.11 km per 0.01 deg lat)
function samp(lat: number, recordedAt: string): EtaSample {
  return { lat, lng: 0, recordedAt };
}

// Helper: 3-stand route with cumulative [0, 100, 200]
function route3(): RouteStandInput[] {
  return [
    { standId: 's1', standName: 'Origin', sequence: 1, distanceFromPrevKm: 0 },
    { standId: 's2', standName: 'Middle', sequence: 2, distanceFromPrevKm: 100 },
    { standId: 's3', standName: 'End', sequence: 3, distanceFromPrevKm: 100 },
  ];
}

const NOW = new Date('2026-10-25T14:32:00.000Z');
describe('computeAvgSpeedKmh', () => {
  it('0 samples: returns 0', () => {
    expect(computeAvgSpeedKmh([], NOW)).toBe(0);
  });

  it('1 sample: returns 0 (no delta)', () => {
    expect(computeAvgSpeedKmh([samp(0, '2026-10-25T14:30:00.000Z')], NOW)).toBe(0);
  });

  it('2 samples 1 min apart, ~1.1 km apart: ~67 km/h', () => {
    const samples = [
      samp(0.00, '2026-10-25T14:31:00.000Z'),
      samp(0.01, '2026-10-25T14:32:00.000Z'),
    ];
    const speed = computeAvgSpeedKmh(samples, NOW);
    expect(speed).toBeGreaterThan(60);
    expect(speed).toBeLessThan(75);
  });

  it('samples outside 5-min window: falls back to full trip', () => {
    const samples = [
      samp(0.00, '2026-10-25T14:00:00.000Z'),
      samp(0.01, '2026-10-25T14:01:00.000Z'),
    ];
    const speed = computeAvgSpeedKmh(samples, NOW);
    expect(speed).toBeGreaterThan(0);
    expect(speed).toBeLessThan(100);
  });

  it('identical timestamps: returns 0 (no div by zero)', () => {
    const samples = [
      samp(0.00, '2026-10-25T14:31:00.000Z'),
      samp(0.01, '2026-10-25T14:31:00.000Z'),
    ];
    expect(computeAvgSpeedKmh(samples, NOW)).toBe(0);
  });
});

describe('computeTripDistanceKm', () => {
  it('0 samples: 0 km', () => {
    expect(computeTripDistanceKm([])).toBe(0);
  });

  it('1 sample: 0 km', () => {
    expect(computeTripDistanceKm([samp(0, '2026-10-25T14:30:00.000Z')])).toBe(0);
  });

  it('2 samples: ~1.11 km', () => {
    const d = computeTripDistanceKm([
      samp(0.00, '2026-10-25T14:30:00.000Z'),
      samp(0.01, '2026-10-25T14:31:00.000Z'),
    ]);
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.2);
  });

  it('3 samples: sums segments (~2.22 km)', () => {
    const d = computeTripDistanceKm([
      samp(0.00, '2026-10-25T14:30:00.000Z'),
      samp(0.01, '2026-10-25T14:31:00.000Z'),
      samp(0.02, '2026-10-25T14:32:00.000Z'),
    ]);
    expect(d).toBeGreaterThan(2.0);
    expect(d).toBeLessThan(2.4);
  });
});
describe('computeNextStandIndex', () => {
  it('only 1 stand: returns -1 (no next)', () => {
    const r = [route3()[0]!];
    expect(computeNextStandIndex(r, 0)).toBe(-1);
  });

  it('trip distance 0: next is stand 2 (skip source)', () => {
    expect(computeNextStandIndex(route3(), 0)).toBe(1);
  });

  it('trip distance 50 of 100 cumulative: next is stand 2', () => {
    expect(computeNextStandIndex(route3(), 50)).toBe(1);
  });

  it('trip distance exactly 100: next is stand 2 (arrival)', () => {
    expect(computeNextStandIndex(route3(), 100)).toBe(1);
  });

  it('trip distance 150 of 200 cumulative: next is stand 3', () => {
    expect(computeNextStandIndex(route3(), 150)).toBe(2);
  });

  it('trip distance past last stand (250): returns -1', () => {
    expect(computeNextStandIndex(route3(), 250)).toBe(-1);
  });
});

describe('computeEta', () => {
  it('0 samples: empty eta, null next', () => {
    const r = computeEta({ samples: [], routeStands: route3(), now: NOW });
    expect(r.eta).toEqual([]);
    expect(r.nextStandId).toBeNull();
    expect(r.nextEtaMinutes).toBeNull();
    expect(r.avgSpeedKmh).toBe(0);
  });

  it('happy path: computes eta for stand 2 and 3', () => {
    // 2 samples, 60s apart, ~1.1 km apart → ~66 km/h
    // Trip distance ~1.1 km, next stand = index 1 (cum 100)
    // remaining = 100 km at 66 km/h = ~91 min
    const samples = [
      samp(0.00, '2026-10-25T14:31:00.000Z'),
      samp(0.01, '2026-10-25T14:32:00.000Z'),
    ];
    const r = computeEta({ samples, routeStands: route3(), now: NOW });
    expect(r.eta.length).toBe(2);
    expect(r.eta[0]!.standId).toBe('s2');
    expect(r.eta[0]!.etaMinutes).toBeGreaterThan(80);
    expect(r.eta[0]!.etaMinutes).toBeLessThan(110);
    expect(r.eta[1]!.standId).toBe('s3');
    expect(r.eta[1]!.etaMinutes).toBeGreaterThan(r.eta[0]!.etaMinutes);
    expect(r.nextStandId).toBe('s2');
  });

  it('zero-speed: avg < 5 km/h caps ETA at 120 min', () => {
    // 2 samples 60s apart, very close (5m apart) → ~0.3 km/h
    const samples = [
      samp(0.0, '2026-10-25T14:31:00.000Z'),
      samp(0.00004, '2026-10-25T14:32:00.000Z'),
    ];
    const r = computeEta({ samples, routeStands: route3(), now: NOW });
    expect(r.eta[0]!.etaMinutes).toBe(ETA_ZERO_SPEED_CAP_MIN);
  });

  it('past last stand: empty eta, null next', () => {
    const r = computeEta({
      samples: [
        samp(0.00, '2026-10-25T14:00:00.000Z'),
        samp(2.00, '2026-10-25T14:30:00.000Z'),
      ],
      routeStands: route3(),
      now: NOW,
    });
    expect(r.eta).toEqual([]);
    expect(r.nextStandId).toBeNull();
  });

  it('avgSpeedKmh is computed and returned', () => {
    const samples = [
      samp(0.00, '2026-10-25T14:31:00.000Z'),
      samp(0.01, '2026-10-25T14:32:00.000Z'),
    ];
    const r = computeEta({ samples, routeStands: route3(), now: NOW });
    expect(r.avgSpeedKmh).toBeGreaterThan(0);
  });

  it('zero-speed path still yields positive eta', () => {
    const samples = [
      samp(0.0, '2026-10-25T14:31:00.000Z'),
      samp(0.00004, '2026-10-25T14:32:00.000Z'),
    ];
    const r = computeEta({ samples, routeStands: route3(), now: NOW });
    expect(r.eta[0]!.etaMinutes).toBeGreaterThan(0);
  });
});