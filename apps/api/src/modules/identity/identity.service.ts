import { newUuid } from '../../lib/ids.js';
import { errors } from '../../lib/errors.js';
import { hashDeviceFingerprint } from '../../lib/phone.js';
import { env } from '../../config/env.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import {
  issueSessionTokens,
  rotateRefreshToken,
  revokeSession,
  revokeOtherDriverSessions,
} from './jwt.service.js';
import { createOtpChallenge, consumeOtpChallenge, resolveOtpIdentifier } from './otp.service.js';
import {
  requestEmailReset,
  requestPhoneReset,
  completeEmailReset,
  completePhoneReset,
  type ResetActor,
} from './password-reset.service.js';
import {
  findUserByPhone,
  findUserByEmail,
  findOperatorByEmail,
  findAdminByEmail,
  findDriverProfileByUser,
  findOperatorUserByPhone,
  findOperatorByGstin,
  createPassengerUser,
  createOperatorSignup,
} from './identity.repository.js';
import { toUserDTO } from './identity.mappers.js';
import { emitIdentityEvent } from './identity.events.js';
import { writeAuditEvent } from '../../lib/audit.js';
import { emitToTopic } from '../../realtime/emit.js';
import * as events from '../../realtime/events.js';
import type { LoginResult, RefreshResult, OperatorSignupResult } from './identity.types.js';

export async function passengerOtpRequest(params: {
  phone?: string | undefined;
  email?: string | undefined;
  intent: 'LOGIN' | 'SIGNUP';
  ip?: string | undefined;
}): Promise<{ expiresInSeconds: number }> {
  const { identifier, channel } = resolveOtpIdentifier(params);

  if (params.intent === 'SIGNUP' && channel === 'EMAIL') {
    throw errors.emailSignupNotSupported();
  }

  if (params.intent === 'SIGNUP' && channel === 'PHONE') {
    const existing = await findUserByPhone(identifier);
    if (existing) throw errors.phoneAlreadyRegistered();
  }

  const result = await createOtpChallenge({ identifier, channel, purpose: 'LOGIN' });
  return { expiresInSeconds: result.expiresInSeconds };
}

export async function passengerOtpVerify(params: {
  phone?: string | undefined;
  email?: string | undefined;
  otp: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
}): Promise<LoginResult> {
  const { identifier, channel } = resolveOtpIdentifier(params);

  await consumeOtpChallenge({ identifier, otp: params.otp, purpose: 'LOGIN' });

  let user =
    channel === 'PHONE' ? await findUserByPhone(identifier) : await findUserByEmail(identifier);

  if (!user) {
    if (channel === 'EMAIL') throw errors.invalidOtp();
    user = await createPassengerUser({ phone: identifier, ip: params.ip });
    emitIdentityEvent({ type: 'user_registered', userId: user.id });
  }

  const sessionId = newUuid();
  const tokens = await issueSessionTokens({
    userId: user.id,
    role: 'REGISTERED_PASSENGER',
    sessionId,
  });

  emitIdentityEvent({
    type: 'session_created',
    userId: user.id,
    sessionId,
    ip: params.ip,
    userAgent: params.userAgent,
    metadata: { role: 'REGISTERED_PASSENGER' },
  });

  return { ...tokens, user: toUserDTO(user) };
}

export async function driverOtpRequest(params: {
  phone: string;
  ip?: string | undefined;
}): Promise<{ expiresInSeconds: number }> {
  const { identifier, channel } = resolveOtpIdentifier({ phone: params.phone });
  if (channel !== 'PHONE') throw errors.invalidPhoneFormat();
  const result = await createOtpChallenge({ identifier, channel, purpose: 'LOGIN' });
  return { expiresInSeconds: result.expiresInSeconds };
}

export async function driverOtpVerify(params: {
  phone: string;
  otp: string;
  deviceFingerprint: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
}): Promise<LoginResult> {
  const { identifier } = resolveOtpIdentifier({ phone: params.phone });

  await consumeOtpChallenge({ identifier, otp: params.otp, purpose: 'LOGIN' });

  const user = await findUserByPhone(identifier);
  if (!user) throw errors.invalidCredentials();

  const driver = await findDriverProfileByUser(user.id);
  if (!driver) throw errors.forbidden('Not a registered driver');
  if (driver.kycStatus !== 'VERIFIED') throw errors.forbidden('Driver KYC not verified');

  const sessionId = newUuid();
  const deviceFingerprintHash = hashDeviceFingerprint(params.deviceFingerprint);

  const tokens = await issueSessionTokens({
    userId: user.id,
    role: 'DRIVER',
    sessionId,
    deviceFingerprintHash,
  });

  if (!env.DEMO_MULTI_DEVICE_DRIVER) {
    const revoked = await revokeOtherDriverSessions(user.id, sessionId);
    if (revoked > 0) {
      emitIdentityEvent({
        type: 'single_device_revoked',
        userId: user.id,
        sessionId,
        metadata: { revokedCount: revoked },
      });
    }
  }

  emitIdentityEvent({
    type: 'session_created',
    userId: user.id,
    sessionId,
    ip: params.ip,
    userAgent: params.userAgent,
    metadata: { role: 'DRIVER' },
  });

  return { ...tokens, user: toUserDTO(user) };
}

export async function operatorOtpRequest(params: {
  phone: string;
  ip?: string | undefined;
}): Promise<{ expiresInSeconds: number }> {
  const { identifier, channel } = resolveOtpIdentifier({ phone: params.phone });
  const result = await createOtpChallenge({ identifier, channel, purpose: 'LOGIN' });
  return { expiresInSeconds: result.expiresInSeconds };
}

export async function operatorOtpVerify(params: {
  phone: string;
  otp: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
}): Promise<LoginResult> {
  const { identifier } = resolveOtpIdentifier({ phone: params.phone });
  await consumeOtpChallenge({ identifier, otp: params.otp, purpose: 'LOGIN' });

  const opUser = await findOperatorUserByPhone(identifier);
  if (!opUser) throw errors.invalidCredentials();

  const role = opUser.role === 'OWNER' ? 'OPERATOR_OWNER' : 'OPERATOR_MANAGER';
  const sessionId = newUuid();
  const tokens = await issueSessionTokens({ userId: opUser.userId, role, sessionId });

  emitIdentityEvent({
    type: 'session_created',
    userId: opUser.userId,
    sessionId,
    ip: params.ip,
    userAgent: params.userAgent,
    metadata: { role, operatorId: opUser.operatorId },
  });

  return { ...tokens, user: toUserDTO(opUser.user) };
}

export async function operatorLogin(params: {
  email: string;
  password: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
}): Promise<LoginResult> {
  const opUser = await findOperatorByEmail(params.email);
  if (!opUser) throw errors.invalidCredentials();
  if (!opUser.user.emailVerified) throw errors.emailNotVerified();

  const ok = await verifyPassword(opUser.passwordHash, params.password);
  if (!ok) throw errors.invalidCredentials();

  const role = opUser.role === 'OWNER' ? 'OPERATOR_OWNER' : 'OPERATOR_MANAGER';
  const sessionId = newUuid();
  const tokens = await issueSessionTokens({ userId: opUser.userId, role, sessionId });

  emitIdentityEvent({
    type: 'session_created',
    userId: opUser.userId,
    sessionId,
    ip: params.ip,
    userAgent: params.userAgent,
    metadata: { role, operatorId: opUser.operatorId },
  });

  return { ...tokens, user: toUserDTO(opUser.user) };
}

export async function adminLogin(params: {
  email: string;
  password: string;
  ip?: string | undefined;
  userAgent?: string | undefined;
}): Promise<LoginResult> {
  const admin = await findAdminByEmail(params.email);
  if (!admin) throw errors.invalidCredentials();

  const ok = await verifyPassword(admin.passwordHash, params.password);
  if (!ok) throw errors.invalidCredentials();

  const sessionId = newUuid();
  const tokens = await issueSessionTokens({
    userId: admin.userId,
    role: 'SUPER_ADMIN',
    sessionId,
  });

  emitIdentityEvent({
    type: 'session_created',
    userId: admin.userId,
    sessionId,
    ip: params.ip,
    userAgent: params.userAgent,
    metadata: { role: 'SUPER_ADMIN' },
  });

  return { ...tokens, user: toUserDTO(admin.user) };
}

export async function passwordResetRequest(
  params: { email?: string | undefined; phone?: string | undefined },
  actor: ResetActor,
): Promise<{ sent: true; expiresInSeconds?: number | undefined }> {
  if (params.email) return requestEmailReset(params.email, actor);
  if (params.phone) return requestPhoneReset(params.phone, actor);
  throw errors.invalidRequest('Provide either email or phone');
}

export async function passwordResetVerifyOperator(params: {
  token?: string | undefined;
  phone?: string | undefined;
  otp?: string | undefined;
  newPassword: string;
}): Promise<{ reset: true; sessionsRevoked: number }> {
  if (params.token) return completeEmailReset(params.token, params.newPassword);
  if (params.phone && params.otp)
    return completePhoneReset(params.phone, params.otp, params.newPassword);
  throw errors.invalidRequest('Provide either token or phone+otp');
}

export const passwordResetVerifyAdmin = passwordResetVerifyOperator;

export async function refreshSession(refreshToken: string): Promise<RefreshResult> {
  return rotateRefreshToken(refreshToken);
}

export async function logout(sessionId: string, userId: string): Promise<void> {
  await revokeSession(sessionId, 'USER_LOGOUT');
  emitIdentityEvent({ type: 'session_revoked', sessionId, userId });
}
// ---------- Operator signup (Phase 13) ----------

export async function operatorSignup(params: {
  companyName: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  password: string;
  ip?: string | undefined;
}): Promise<OperatorSignupResult> {
  // 1. Pre-check duplicates for clear error messages
  const existingEmail = await findUserByEmail(params.email);
  if (existingEmail) throw errors.emailAlreadyRegistered();

  const existingPhone = await findUserByPhone(params.phone);
  if (existingPhone) throw errors.phoneAlreadyRegistered();

  const existingGstin = await findOperatorByGstin(params.gstin);
  if (existingGstin) throw errors.gstinAlreadyRegistered();

  // 2. Hash password (Argon2id)
  const passwordHash = await hashPassword(params.password);

  // 3. Create User + Operator + OperatorUser + consent records in one tx
  const { user, operator } = await createOperatorSignup({
    companyName: params.companyName,
    gstin: params.gstin,
    pan: params.pan,
    email: params.email,
    phone: params.phone,
    passwordHash,
    ip: params.ip,
  });

  // 4. Audit log (best-effort, after tx commits)
  try {
    await writeAuditEvent({
      actorId: null,
      sessionId: null,
      entityType: 'Operator',
      entityId: operator.id,
      action: 'operator_signup',
      ipAddress: params.ip ?? null,
      metadata: {
        companyName: params.companyName,
        userId: user.id,
      },
    });
  } catch {
    /* non-fatal: entity creation already succeeded */
  }

  // 5. Identity event (structured audit log)
  emitIdentityEvent({
    type: 'operator_signup_submitted',
    userId: user.id,
    ip: params.ip,
    metadata: { role: 'OPERATOR_OWNER', operatorId: operator.id },
  });

  // 6. WS emit to admin:notifications topic
  emitToTopic('admin:notifications', events.operatorApplied({
    operatorId: operator.id,
    companyName: params.companyName,
    submittedAt: new Date().toISOString(),
  }));

  return {
    operatorId: operator.id,
    userId: user.id,
    status: 'APPLIED',
    message: 'Application submitted. You will be notified once an admin reviews it.',
  };
}