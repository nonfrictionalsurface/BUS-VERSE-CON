import crypto from 'node:crypto';

const NONCE_LEN = 12;
const TAG_LEN = 16;

/**
 * AES-256-GCM encryption.
 * Storage format: base64(nonce ‖ ciphertext ‖ tag)
 */
export function encrypt(plaintext: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) throw new Error('AES-256-GCM key must be 32 bytes');
  const nonce = crypto.randomBytes(NONCE_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, ct, tag]).toString('base64');
}

export function decrypt(stored: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) throw new Error('AES-256-GCM key must be 32 bytes');
  const raw = Buffer.from(stored, 'base64');
  if (raw.length < NONCE_LEN + TAG_LEN) throw new Error('Ciphertext too short');
  const nonce = raw.subarray(0, NONCE_LEN);
  const tag = raw.subarray(raw.length - TAG_LEN);
  const ct = raw.subarray(NONCE_LEN, raw.length - TAG_LEN);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/**
 * SHA-256 hex hash with optional salt.
 */
export function sha256(input: string, salt = ''): string {
  return crypto.createHash('sha256').update(salt + input).digest('hex');
}

/**
 * Constant-time string compare. Length mismatch returns false (does NOT throw).
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}