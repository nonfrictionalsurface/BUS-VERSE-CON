import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { redis, keys } from '../../lib/redis.js';
import { sha256, timingSafeEqualString } from '../../lib/crypto.js';
import { errors } from '../../lib/errors.js';
import { smsAdapter } from '../../integrations/msg91.js';
import { emailAdapter } from '../../integrations/sendgrid.js';
import { isValidEmail, normalizeEmail } from '../../lib/email.js';
import { isValidPhone, normalizePhone } from '../../lib/phone.js';
import {
  OTP_MAX_ATTEMPTS,
  OTP_REQUEST_MAX,
  OTP_REQUEST_WINDOW_SECONDS,
  OTP_TTL_SECONDS,
} from './identity.types.js';

export type OtpPurpose = 'LOGIN' | 'RESET';

export interface GeneratedOtp {
  raw: string;
  hash: string;
  salt: string;
}

export function generateOtp(): GeneratedOtp {
  const raw = env.MOCK_OTP ? '123456' : String(crypto.randomInt(100000, 1000000));
  const salt = crypto.randomBytes(16).toString('base64');
  const hash = sha256(raw, salt);
  return { raw, hash, salt };
}

export function verifyOtp(raw: string, hash: string, salt: string): boolean {
  const computed = sha256(raw, salt);
  return timingSafeEqualString(computed, hash);
}

async function enforceOtpRequestRate(identifier: string): Promise<void> {
  const key = keys.rateLimit('otp-request', identifier);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, OTP_REQUEST_WINDOW_SECONDS);
  if (count > OTP_REQUEST_MAX) {
    throw errors.rateLimited(
      `Too many OTP requests. Try again in ${Math.ceil(OTP_REQUEST_WINDOW_SECONDS / 60)} minutes.`,
    );
  }
}

export async function enforceOtpVerifyRate(identifier: string): Promise<void> {
  const key = keys.rateLimit('otp-verify', identifier);
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, OTP_REQUEST_WINDOW_SECONDS);
  if (count > OTP_MAX_ATTEMPTS) {
    throw errors.otpAttemptsExceeded();
  }
}

async function deliverOtp(
  identifier: string,
  channel: 'PHONE' | 'EMAIL',
  rawOtp: string,
  purpose: OtpPurpose,
): Promise<void> {
  const label = purpose === 'RESET' ? 'password reset' : 'login';
  if (channel === 'PHONE') {
    await smsAdapter.send({
      phone: identifier,
      body: `Your BusVerse ${label} OTP is ${rawOtp}. Valid for 10 minutes. Do not share.`,
      template: 'otp',
    });
  } else {
    await emailAdapter.send({
      to: identifier,
      subject: `BusVerse ${label} code`,
      body: `Your ${label} code is ${rawOtp}. Valid for 10 minutes. Do not share.`,
      template: 'otp',
    });
  }
}

export async function createOtpChallenge(params: {
  identifier: string;
  channel: 'PHONE' | 'EMAIL';
  purpose: OtpPurpose;
}): Promise<{ expiresInSeconds: number; rawOtpForDev?: string | undefined }> {
  const { identifier, channel, purpose } = params;

  await enforceOtpRequestRate(`${purpose}:${identifier}`);

  const { raw, hash, salt } = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.otpChallenge.create({
    data: {
      phoneOrEmail: identifier,
      otpHash: hash,
      otpSalt: salt,
      expiresAt,
      purpose,
    },
  });

  await deliverOtp(identifier, channel, raw, purpose);

  if (env.MOCK_OTP) {
    return { expiresInSeconds: OTP_TTL_SECONDS, rawOtpForDev: raw };
  }
  return { expiresInSeconds: OTP_TTL_SECONDS };
}

export async function consumeOtpChallenge(params: {
  identifier: string;
  otp: string;
  purpose: OtpPurpose;
}): Promise<{ challengeId: string }> {
  const { identifier, otp, purpose } = params;

  await enforceOtpVerifyRate(`${purpose}:${identifier}`);

  const challenge = await prisma.otpChallenge.findFirst({
    where: {
      phoneOrEmail: identifier,
      purpose,
      consumedAt: null,
      deletedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) throw errors.otpExpired();
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) throw errors.otpAttemptsExceeded();

  if (!verifyOtp(otp, challenge.otpHash, challenge.otpSalt)) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    throw errors.invalidOtp();
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  return { challengeId: challenge.id };
}

export function resolveOtpIdentifier(params: {
  phone?: string | undefined;
  email?: string | undefined;
}): { identifier: string; channel: 'PHONE' | 'EMAIL' } {
  if (params.phone && params.email) {
    throw errors.invalidRequest('Provide exactly one of phone or email');
  }
  if (params.phone) {
    const normalized = normalizePhone(params.phone);
    if (!isValidPhone(normalized)) throw errors.invalidPhoneFormat();
    return { identifier: normalized, channel: 'PHONE' };
  }
  if (params.email) {
    const normalized = normalizeEmail(params.email);
    if (!isValidEmail(normalized)) throw errors.invalidEmailFormat();
    return { identifier: normalized, channel: 'EMAIL' };
  }
  throw errors.invalidRequest('Provide either phone or email');
}