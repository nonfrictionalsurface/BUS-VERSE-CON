import * as ed from '@noble/ed25519';
import { env, isProd, isTest } from '../config/env.js';

interface Keypair { sk: Uint8Array; pk: Uint8Array; ephemeral: boolean }
let cached: Keypair | null = null;

const isPlaceholder = (v: string) => /^REPLACE/i.test(v);
const decodeB64 = (b64: string) => new Uint8Array(Buffer.from(b64, 'base64'));

async function getKeypair(): Promise<Keypair> {
  if (cached) return cached;
  const skB64 = env.QR_SIGNING_PRIVATE_KEY;
  const pkB64 = env.QR_SIGNING_PUBLIC_KEY;
  if (skB64 && pkB64 && !isPlaceholder(skB64) && !isPlaceholder(pkB64)) {
    const sk = decodeB64(skB64);
    const pk = decodeB64(pkB64);
    if (sk.length !== 32) throw new Error('QR_SIGNING_PRIVATE_KEY must be 32 raw bytes');
    if (pk.length !== 32) throw new Error('QR_SIGNING_PUBLIC_KEY must be 32 raw bytes');
    cached = { sk, pk, ephemeral: false };
    return cached;
  }
  if (isProd) throw new Error('QR_SIGNING_PRIVATE_KEY and QR_SIGNING_PUBLIC_KEY required in production');
  if (isTest) throw new Error('QR_SIGNING_*_KEY missing in .env.test — Session 0d must run first');
  console.warn('[ed25519] QR_SIGNING_*_KEY missing — using ephemeral dev key. Tickets will NOT verify across restarts.');
  const sk = ed.utils.randomSecretKey();
  const pk = await ed.getPublicKeyAsync(sk);
  cached = { sk, pk, ephemeral: true };
  return cached;
}
export async function sign(bytes: Uint8Array): Promise<Uint8Array> {
  const { sk } = await getKeypair();
  return ed.signAsync(bytes, sk);
}

export async function verify(signature: Uint8Array, bytes: Uint8Array): Promise<boolean> {
  try {
    const { pk } = await getKeypair();
    return await ed.verifyAsync(signature, bytes, pk);
  } catch {
    return false;
  }
}

export async function getPublicKeyB64(): Promise<string> {
  const { pk } = await getKeypair();
  return Buffer.from(pk).toString('base64');
}

export function resetKeyCache(): void {
  cached = null;
}