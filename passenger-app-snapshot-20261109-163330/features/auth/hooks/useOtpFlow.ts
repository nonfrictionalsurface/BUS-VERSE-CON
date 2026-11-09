import { useCallback, useEffect, useState } from 'react';
import { requestOtp, verifyOtp } from '../api/auth.api';
import { useAuth } from '../../../lib/auth';
import { useToast } from '../../../components/ui';
import { phoneToE164 } from '../../../lib/format';
import { ApiError } from '../../../lib/api';

export type OtpStep = 'phone' | 'otp' | 'success';

const RESEND_COOLDOWN_SECONDS = 30;

export interface UseOtpFlowResult {
  step: OtpStep;
  phone: string;
  otp: string;
  loading: boolean;
  error: string | null;
  resendIn: number;
  setPhone: (v: string) => void;
  setOtp: (v: string) => void;
  requestCode: () => Promise<boolean>;
  verify: () => Promise<boolean>;
  resend: () => Promise<boolean>;
  reset: () => void;
}

export function useOtpFlow(): UseOtpFlowResult {
  const { login } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState<OtpStep>('phone');
  const [phone, setPhoneState] = useState('');
  const [otp, setOtpState] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const setPhone = useCallback((v: string) => {
    setPhoneState(v.replace(/\D/g, '').slice(0, 10));
    if (error) setError(null);
  }, [error]);

  const setOtp = useCallback((v: string) => {
    setOtpState(v.replace(/\D/g, '').slice(0, 6));
    if (error) setError(null);
  }, [error]);

  const requestCode = useCallback(async (): Promise<boolean> => {
    if (phone.length !== 10) {
      setError('Enter a 10-digit mobile number');
      return false;
    }
    const e164 = phoneToE164(phone);
    setError(null);
    setLoading(true);
    try {
      await requestOtp({ phone: e164, intent: 'LOGIN' });
      setStep('otp');
      setResendIn(RESEND_COOLDOWN_SECONDS);
      return true;
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      setError(err?.message ?? 'Could not send code. Try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const verify = useCallback(async (): Promise<boolean> => {
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return false;
    }
    const e164 = phoneToE164(phone);
    setError(null);
    setLoading(true);
    try {
      const result = await verifyOtp({ phone: e164, otp });
      await login(result);
      setStep('success');
      toast.show('Signed in', 'success', 2000);
      return true;
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      setError(err?.message ?? 'Invalid code. Try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [phone, otp, login, toast]);

  const resend = useCallback(async (): Promise<boolean> => {
    if (resendIn > 0 || loading) return false;
    const e164 = phoneToE164(phone);
    setLoading(true);
    try {
      await requestOtp({ phone: e164, intent: 'LOGIN' });
      setResendIn(RESEND_COOLDOWN_SECONDS);
      toast.show('New code sent', 'success', 2000);
      return true;
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      toast.show(err?.message ?? 'Could not resend', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [phone, resendIn, loading, toast]);

  const reset = useCallback(() => {
    setStep('phone');
    setOtpState('');
    setError(null);
    setResendIn(0);
  }, []);

  return {
    step,
    phone,
    otp,
    loading,
    error,
    resendIn,
    setPhone,
    setOtp,
    requestCode,
    verify,
    resend,
    reset,
  };
}