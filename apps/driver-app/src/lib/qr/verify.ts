import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

const _edAny = ed as any;
if (_edAny.etc && !_edAny.etc.sha512Sync) {
  try { _edAny.etc.sha512Sync = (...m: Uint8Array[]) => sha512(_edAny.etc.concatBytes(...m)); } catch {}
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = typeof atob !== 'undefined' ? atob(b64) : (global as any).Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function verifyQr(qrPayload: string, publicKeyB64: string): Promise<{ valid: true; data: any }> {
  const parts = qrPayload.split(':');
  if (parts.length !== 3 || parts[0] !== 'v1') throw new Error('Invalid QR format');
  
  const payloadBytes = b64ToBytes(parts[1]);
  const signature = b64ToBytes(parts[2]);
  const publicKey = b64ToBytes(publicKeyB64);
  
  const ok = await ed.verifyAsync(signature, payloadBytes, publicKey);
  if (!ok) throw new Error('Invalid ticket signature');
  
  const data = JSON.parse(new TextDecoder().decode(payloadBytes));
  return { valid: true, data };
}