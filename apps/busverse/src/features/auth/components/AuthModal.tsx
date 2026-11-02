'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { X, ArrowRight, Loader2, KeyRound, Phone } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginWithTokens } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim()}`;
    if (!/^\+91[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Enter a valid 10-digit Indian mobile number');
      return;
    }

    setLoading(true);
    try {
      await api.post('/passenger/auth/otp/request', {
        phone: cleanPhone,
        intent: 'LOGIN',
      });
      setStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || 'Failed to request verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    const cleanPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim()}`;
    setLoading(true);
    try {
      const res = await api.post<any>('/passenger/auth/otp/verify', {
        phone: cleanPhone,
        otp: otp.trim(),
      });

      loginWithTokens({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        user: res.data.user,
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Invalid or expired OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl border border-border-strong bg-surface-card p-6 shadow-modal">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-muted hover:text-ink-bright transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary-subtle text-brand-primary">
            {step === 'phone' ? <Phone className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
          </div>
          <h3 className="font-sans text-lg font-bold text-ink-bright">
            {step === 'phone' ? 'Enter Phone Number' : 'Verification Code'}
          </h3>
          <p className="mt-1 text-xs text-ink-secondary">
            {step === 'phone'
              ? 'We will send a 6-digit OTP code to verify your account'
              : `Code sent to ${phone}. (DEV default: 123456)`}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger-crimson/30 bg-danger-crimson/10 p-3 text-xs text-danger-crimson font-medium">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Mobile Number</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-mono text-xs text-ink-muted">+91</span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full rounded-xl border border-border-subtle bg-surface-sunken pl-12 pr-4 py-2.5 font-mono text-sm text-ink-bright placeholder-ink-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-2.5 text-xs font-bold text-white transition-all hover:bg-brand-hover disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">6-Digit Code</label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center tracking-[0.5em] font-mono text-lg rounded-xl border border-border-subtle bg-surface-sunken py-2.5 text-ink-bright focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-2.5 text-xs font-bold text-white transition-all hover:bg-brand-hover disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Proceed'}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-ink-muted hover:text-ink-primary font-medium"
              >
                Change Phone
              </button>
              <button
                type="button"
                disabled={resendCooldown > 0}
                onClick={handleRequestOtp}
                className="text-brand-primary font-semibold disabled:text-ink-muted"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
