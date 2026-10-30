import { describe, it, expect } from 'vitest';
import {
  canonicalizeToBytes, buildWireFormat, parseWireFormat, MAX_PAYLOAD_BYTES,
  type QRPayloadV2,
} from '../../src/lib/qr.js';
import { sign, verify } from '../../src/lib/ed25519.js';

const BASE: QRPayloadV2 = {
  v: 1,
  ticketId: 'tkt_demo_single_001',
  bookingId: 'bkg_demo_single_001',
  scheduleId: 'sch_demo_day1_1400',
  primarySeatId: 'seat_dl1p5678_a1',
  primarySeatLabel: 'A1',
  primaryPassengerName: 'Alice Gupta',
  passengerCount: 1,
  allSeatLabels: ['A1'],
  boardingStandId: 'stand_kashmere_gate',
  issuedAt: '2026-10-25T08:00:00.000Z',
  nonce: 'dGVzdG5vbmNlMDAwMQ==',
};

const TV01_EXPECTED_CANONICAL = '{"allSeatLabels":["A1"],"boardingStandId":"stand_kashmere_gate","bookingId":"bkg_demo_single_001","issuedAt":"2026-10-25T08:00:00.000Z","nonce":"dGVzdG5vbmNlMDAwMQ==","passengerCount":1,"primaryPassengerName":"Alice Gupta","primarySeatId":"seat_dl1p5678_a1","primarySeatLabel":"A1","scheduleId":"sch_demo_day1_1400","ticketId":"tkt_demo_single_001","v":1}';

describe('QR signing — shared/02 §9 test vectors', () => {
  describe('TV-01 — single passenger baseline', () => {
    it('canonicalizes to the exact expected bytes (shared/02 §9.2)', () => {
      const bytes = canonicalizeToBytes(BASE);
      expect(Buffer.from(bytes).toString('utf-8')).toBe(TV01_EXPECTED_CANONICAL);
      expect(bytes.length).toBe(TV01_EXPECTED_CANONICAL.length);
    });

    it('signs and verifies roundtrip', async () => {
      const bytes = canonicalizeToBytes(BASE);
      const sig = await sign(bytes);
      expect(sig.length).toBe(64);
      expect(await verify(sig, bytes)).toBe(true);
    });

    it('builds wire format v1:payload:sig', async () => {
      const sig = await sign(canonicalizeToBytes(BASE));
      const wire = buildWireFormat(BASE, sig);
      expect(wire).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
      expect(wire.split(':').length).toBe(3);
    });

    it('parses wire back to identical payload + verifies', async () => {
      const sig = await sign(canonicalizeToBytes(BASE));
      const wire = buildWireFormat(BASE, sig);
      const parsed = parseWireFormat(wire);
      expect(parsed.payload).toEqual(BASE);
      expect(await verify(parsed.signature, parsed.canonicalBytes)).toBe(true);
    });

    it('rejects tampered payload', async () => {
      const sig = await sign(canonicalizeToBytes(BASE));
      const tampered = canonicalizeToBytes({ ...BASE, primaryPassengerName: 'Mallory' });
      expect(await verify(sig, tampered)).toBe(false);
    });
  });
  describe('TV-02 — multi-passenger (3)', () => {
    const tv02: QRPayloadV2 = {
      ...BASE,
      ticketId: 'tkt_demo_multi_001',
      bookingId: 'bkg_demo_multi_001',
      passengerCount: 3,
      allSeatLabels: ['A1', 'A2', 'A3'],
      nonce: 'dGVzdG5vbmNlMDAwMg==',
    };
    it('carries passengerCount 3 and allSeatLabels length 3', () => {
      expect(tv02.passengerCount).toBe(3);
      expect(tv02.allSeatLabels.length).toBe(3);
      const bytes = canonicalizeToBytes(tv02);
      const str = Buffer.from(bytes).toString('utf-8');
      expect(str).toContain('"passengerCount":3');
      expect(str).toContain('"allSeatLabels":["A1","A2","A3"]');
    });
    it('signs and verifies roundtrip', async () => {
      const bytes = canonicalizeToBytes(tv02);
      const sig = await sign(bytes);
      expect(await verify(sig, bytes)).toBe(true);
    });
  });

  describe('TV-03 — Unicode (Devanagari)', () => {
    const tv03: QRPayloadV2 = {
      ...BASE,
      primaryPassengerName: 'आलिया शर्मा',
      nonce: 'dGVzdG5vbmNlMDAwMw==',
    };
    it('passes UTF-8 through unescaped (no \\uXXXX)', () => {
      const bytes = canonicalizeToBytes(tv03);
      const str = Buffer.from(bytes).toString('utf-8');
      expect(str).toContain('आलिया शर्मा');
      expect(str).not.toMatch(/\\u[0-9a-fA-F]{4}/);
    });
    it('signs and verifies roundtrip', async () => {
      const bytes = canonicalizeToBytes(tv03);
      const sig = await sign(bytes);
      expect(await verify(sig, bytes)).toBe(true);
    });
  });
  describe('TV-04 — edge characters', () => {
    const tv04: QRPayloadV2 = {
      ...BASE,
      primaryPassengerName: "José D'Souza (Jr.)",
      nonce: 'dGVzdG5vbmNlMDAwNA==',
    };
    it('handles accent, apostrophe, parens, period', async () => {
      const bytes = canonicalizeToBytes(tv04);
      const sig = await sign(bytes);
      expect(await verify(sig, bytes)).toBe(true);
    });
  });

  describe('TV-05 — 8-passenger maximum', () => {
    const tv05: QRPayloadV2 = {
      ...BASE,
      passengerCount: 8,
      allSeatLabels: ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'],
      nonce: 'dGVzdG5vbmNlMDAwNQ==',
    };
    it('fits under the 500-byte payload budget', () => {
      expect(canonicalizeToBytes(tv05).length).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
    });
    it('signs and verifies roundtrip', async () => {
      const bytes = canonicalizeToBytes(tv05);
      const sig = await sign(bytes);
      expect(await verify(sig, bytes)).toBe(true);
    });
  });
});