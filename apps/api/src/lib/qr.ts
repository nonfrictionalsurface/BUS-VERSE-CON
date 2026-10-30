export interface QRPayloadV2 {
  v: 1;
  ticketId: string;
  bookingId: string;
  scheduleId: string;
  primarySeatId: string;
  primarySeatLabel: string;
  primaryPassengerName: string;
  passengerCount: number;
  allSeatLabels: string[];
  boardingStandId: string;
  issuedAt: string;
  nonce: string;
}

const CANONICAL_KEYS: (keyof QRPayloadV2)[] = [
  'allSeatLabels', 'boardingStandId', 'bookingId', 'issuedAt', 'nonce',
  'passengerCount', 'primaryPassengerName', 'primarySeatId', 'primarySeatLabel',
  'scheduleId', 'ticketId', 'v',
];

export const MAX_PAYLOAD_BYTES = 500;
export const MAX_SIGNATURE_BYTES = 64;

export function canonicalizeToBytes(payload: QRPayloadV2): Uint8Array {
  const ordered: Record<string, unknown> = {};
  for (const k of CANONICAL_KEYS) ordered[k] = payload[k];
  return new TextEncoder().encode(JSON.stringify(ordered));
}
export function buildWireFormat(payload: QRPayloadV2, signature: Uint8Array): string {
  const bytes = canonicalizeToBytes(payload);
  return `v1:${Buffer.from(bytes).toString('base64')}:${Buffer.from(signature).toString('base64')}`;
}

export function parseWireFormat(wire: string): {
  payload: QRPayloadV2;
  signature: Uint8Array;
  canonicalBytes: Uint8Array;
} {
  const parts = wire.split(':');
  if (parts.length !== 3) throw new Error('INVALID_FORMAT');
  if (parts[0] !== 'v1') throw new Error('UNSUPPORTED_WIRE_VERSION');
  const canonicalBytes = new Uint8Array(Buffer.from(parts[1]!, 'base64'));
  const signature = new Uint8Array(Buffer.from(parts[2]!, 'base64'));
  if (signature.length !== 64) throw new Error('INVALID_SIGNATURE_LENGTH');
  let payload: QRPayloadV2;
  try {
    payload = JSON.parse(Buffer.from(canonicalBytes).toString('utf-8')) as QRPayloadV2;
  } catch {
    throw new Error('INVALID_PAYLOAD');
  }
  if (payload.v !== 1) throw new Error('UNSUPPORTED_PAYLOAD_VERSION');
  return { payload, signature, canonicalBytes };
}