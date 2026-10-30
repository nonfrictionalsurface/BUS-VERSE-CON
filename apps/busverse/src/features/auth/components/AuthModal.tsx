'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { CONFIG } from '@/lib/config';
import { ShieldCheck, Phone, KeyRound, Loader2, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}

function normalizeToE164(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return input.trim().startsWith('+') ? input.trim() : `+${digits}`;
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Sign In to Reserve Seat',
}: AuthModalProps) {
  const { requestOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const cleaned = normalizeToE164(phone);

    try {
      try {
        await requestOtp(cleaned, 'LOGIN');
      } catch (loginErr: any) {
        // If LOGIN fails because user does not exist, retry with SIGNUP
        await requestOtp(cleaned, 'SIGNUP');
      }
      setPhone(cleaned);
      setStep('OTP');
    } catch (err: any) {
      setError(err.message || 'Please enter a valid 10-digit mobile number (+91XXXXXXXXXX).');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const cleaned = normalizeToE164(phone);

    try {
      await verifyOtp(cleaned, otp.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid code. In DEV mode, use 123456.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-md">
      <div className="w-full max-w-md p-6 rounded-3xl bg-surface-card border border-border-strong shadow-modal relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-full text-ink-muted hover:text-ink-primary hover:bg-surface-hover"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink-bright">{title}</h2>
            <p className="text-xs text-ink-secondary">Instant passenger verification</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-subtle text-danger-crimson text-xs font-semibold">
            {error}
          </div>
        )}

        {step === 'PHONE' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-ink-muted mb-1.5">
                Mobile Number
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3 w-4 h-4 text-brand-primary pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm font-semibold rounded-xl bg-canvas border border-border-strong text-ink-bright focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full py-2.5 text-xs font-bold rounded-xl bg-brand-primary text-white hover:bg-brand-hover shadow-glow disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Send Verification Code</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-ink-muted mb-1.5">
                6-Digit Code sent to {phone}
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3 w-4 h-4 text-brand-primary pointer-events-none" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm font-mono font-bold tracking-widest rounded-xl bg-canvas border border-border-strong text-ink-bright focus:outline-none focus:border-brand-primary text-center"
                />
              </div>
              {CONFIG.IS_DEV && (
                <p className="text-[11px] font-mono text-signal-emerald mt-1.5 text-center">
                  DEV MODE: Enter 123456
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="w-1/3 py-2.5 text-xs font-bold rounded-xl border border-border-strong text-ink-secondary hover:bg-surface-hover"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-2/3 py-2.5 text-xs font-bold rounded-xl bg-brand-primary text-white hover:bg-brand-hover shadow-glow disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Verify & Continue</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}