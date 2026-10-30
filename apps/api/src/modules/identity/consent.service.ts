import { prisma } from '../../lib/prisma.js';
import { emitIdentityEvent } from './identity.events.js';

const POLICY_VERSION = 'v1.0';
const CONSENT_PURPOSES = ['terms_of_service', 'privacy_policy'] as const;

export async function captureSignupConsent(params: {
  userId: string;
  ipAddress?: string | null;
}): Promise<void> {
  await prisma.consentRecord.createMany({
    data: CONSENT_PURPOSES.map((purpose) => ({
      userId: params.userId,
      purpose,
      policyVersion: POLICY_VERSION,
      ipAddress: params.ipAddress ?? null,
    })),
  });

  emitIdentityEvent({
    type: 'consent_granted',
    userId: params.userId,
    metadata: { purposes: CONSENT_PURPOSES, policyVersion: POLICY_VERSION },
  });
}