import crypto from 'node:crypto';

/**
 * Fixed namespace for deterministic UUIDv5 (seed data).
 * Never change — seed IDs would drift.
 */
const SEED_NAMESPACE = 'b7e4a7a6-1a3d-4a2f-9b3c-1f2d3e4a5b6c';

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex');
}

function bytesToUuid(bytes: number[]): string {
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Deterministic UUIDv5 (SHA-1 based, RFC 4122).
 * Same name → same UUID every run. Used for seed data.
 */
export function deterministicUuid(name: string): string {
  const hash = crypto.createHash('sha1');
  hash.update(uuidToBytes(SEED_NAMESPACE));
  hash.update(name);
  const digest = hash.digest();
  const arr = Array.from(digest.subarray(0, 16));
  arr[6] = ((arr[6] ?? 0) & 0x0f) | 0x50; // version 5
  arr[8] = ((arr[8] ?? 0) & 0x3f) | 0x80; // RFC variant
  return bytesToUuid(arr);
}

/**
 * Random UUIDv4 (for runtime — not deterministic).
 */
export function newUuid(): string {
  return crypto.randomUUID();
}

export const displayIdPrefixes = {
  user: 'usr_',
  session: 'ses_',
  operator: 'opr_',
  booking: 'bkg_',
  payment: 'pay_',
  refund: 'ref_',
  trip: 'trp_',
  ticket: 'tkt_',
} as const;

export function displayId(prefix: string, uuid: string): string {
  return `${prefix}${uuid.replace(/-/g, '').slice(0, 12)}`;
}