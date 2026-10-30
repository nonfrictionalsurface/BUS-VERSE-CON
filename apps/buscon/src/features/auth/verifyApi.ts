import { api } from '@/lib/api/client';

/**
 * DEV-ONLY: auto-verify + auto-approve operator.
 * Calls the /dev/verify-and-approve-operator route (NODE_ENV !== 'production').
 */
export async function devVerifyAndApprove(email: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await api.post<{
      ok: boolean;
      userId: string;
      operatorId: string;
      email: string;
    }>('/dev/verify-and-approve-operator', { email }, { skipAuth: true });
    return {
      ok: true,
      message: 'Email verified and operator approved. Logging in…',
    };
  } catch (err: any) {
    if (err?.status === 404) {
      return {
        ok: false,
        message: 'Dev route not registered. Add `operatorDevRouter` to bootstrap.ts (see terminal for instruction).',
      };
    }
    return {
      ok: false,
      message: err?.message || 'Dev verify failed.',
    };
  }
}

/**
 * Resend email — best-effort since backend may not expose this yet.
 */
export async function resendVerificationEmail(email: string): Promise<{ ok: boolean; message: string }> {
  return {
    ok: false,
    message: 'Resend is not implemented in the backend yet. Use the "Dev: auto-verify" button instead.',
  };
}