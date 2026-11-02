import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { env, isProd, isTest } from '../config/env.js';

const _edAny = ed as any;
if (_edAny.etc) {
  if (!_edAny.etc.sha512Sync) {
    try { _edAny.etc.sha512Sync = (...m: Uint8Array[]) => sha512(_edAny.etc.concatBytes(...m)); } catch {}
  }
  if (!_edAny.etc.sha512Async) {
    try { _edAny.etc.sha512Async = (...m: Uint8Array[]) => Promise.resolve(sha512(_edAny.etc.concatBytes(...m))); } catch {}
  }
}

interface Keypair { sk: Uint8Array; pk: Uint8Array; ephemeral: boolean }
let cached: Keypair | null = null;
const isPlaceholder = (v: string) => /^REPLACE/i.test(v);
const decodeB64 = (b64: string) => new Uint8Array(Buffer.from(b64, 'base64'));

async function getKeypair(): Promise<Keypair> {
  if (cached) return cached;
  const skB64 = env.QR_SIGNING_PRIVATE_KEY;
  const pkB64 = env.QR_SIGNING_PUBLIC_KEY;
  if (skB64 && pkB64 && !isPlaceholder(skB64) && !isPlaceholder(pkB64)) {
    cached = { sk: decodeB64(skB64), pk: decodeB64(pkB64), ephemeral: false };
    return cached;
  }
  if (isProd) throw new Error('QR_SIGNING keys required in production');
  if (isTest) throw new Error('QR_SIGNING keys missing in .env.test');
  console.warn('[ed25519] Using ephemeral key. Tickets will NOT verify across restarts.');
  const sk = ed.utils.randomSecretKey();
  cached = { sk, pk: await ed.getPublicKeyAsync(sk), ephemeral: true };
  return cached;
}

export async function sign(bytes: Uint8Array): Promise<Uint8Array> {
  return ed.signAsync(bytes, (await getKeypair()).sk);
}
export async function verify(signature: Uint8Array, bytes: Uint8Array): Promise<boolean> {
  try { return await ed.verifyAsync(signature, bytes, (await getKeypair()).pk); } catch { return false; }
}
export async function getPublicKeyB64(): Promise<string> {
  return Buffer.from((await getKeypair()).pk).toString('base64');
}
export function resetKeyCache(): void { cached = null; }