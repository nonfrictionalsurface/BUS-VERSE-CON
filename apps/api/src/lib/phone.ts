import crypto from 'node:crypto';
import { sha256 } from './crypto.js';
import { env } from '../config/env.js';

const E164_REGEX = /^\+[1-9]\d{1,14}$/;
const INDIA_MOBILE_REGEX = /^\+91[6-9]\d{9}$/;

export function isValidPhone(phone: string): boolean {
  return E164_REGEX.test(phone);
}

export function isIndianMobile(phone: string): boolean {
  return INDIA_MOBILE_REGEX.test(phone);
}

/**
 * Normalize to E.164. Accepts:
 *  - "+919876543210"
 *  - "919876543210" (12 digits starting with 91)
 *  - "9876543210" (10 digits, Indian mobile)
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim().replace(/[\s\-()]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.length === 12 && trimmed.startsWith('91')) return `+${trimmed}`;
  if (trimmed.length === 10) return `+91${trimmed}`;
  return trimmed;
}

/**
 * Deterministic SHA-256 hash with fixed app-level salt.
 * Used for searchable lookup of encrypted phone column.
 */
export function computePhoneHash(phone: string): string {
  return sha256(normalizePhone(phone), env.PHONE_HASH_SALT);
}

/**
 * Mask all but last 4 chars: "••••••3210"
 */
export function maskPhone(phone: string): string {
  if (phone.length < 4) return '••••';
  return `${'•'.repeat(phone.length - 4)}${phone.slice(-4)}`;
}

/**
 * Generate a device fingerprint hash from an arbitrary client-provided
 * fingerprint string. Used for single-device binding on driver sessions.
 */
export function hashDeviceFingerprint(fingerprint: string): string {
  // Fixed app-level salt — deterministic for lookup
  return crypto.createHash('sha256').update(`dfp:${fingerprint}`).digest('hex');
}