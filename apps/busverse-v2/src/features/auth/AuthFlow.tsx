'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { ApiError } from '@/lib/api/client';

type Step = 'phone' | 'otp';

function formatError(err: unknown): string {
  const e = err as ApiError;
  if (!e?.message) return 'Something went wrong. Try again.';
  if (e.details && typeof e.details === 'object') {
    // Zod-style details: { fieldErrors: { phone: ['...'] } } or { issues: [...] }
    const d = e.details as any;
    const fieldErrors = d.fieldErrors ?? {};
    const firstField = Object.keys(fieldErrors)[0];
    if (firstField && Array.isArray(fieldErrors[firstField]) && fieldErrors[firstField][0]) {
      return `${firstField}: ${fieldErrors[firstField][0]}`;
    }
    if (Array.isArray(d.issues) && d.issues[0]?.message) {
      return d.issues[0].message;
    }
  }
  return e.message;
}

export function AuthFlow() {
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhone = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = phone.trim();
    if (!/^\+91[6-9]\d{9}$/.test(trimmed)) {
      setError('Enter a valid Indian mobile number (+91XXXXXXXXXX).');
      return;
    }
    setLoading(true);
    try {
      await requestOtp(trimmed);
      setStep('otp');
    } catch (err) {
      console.error('[AuthFlow] OTP request error:', err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(phone.trim(), otp);
    } catch (err) {
      console.error('[AuthFlow] OTP verify error:', err);
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={handlePhone} className="space-y-4">
        <Input
          label="Phone number"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+919876543210"
          error={error ?? undefined}
          autoComplete="tel"
          autoFocus
        />
        <Button type="submit" loading={loading} fullWidth>
          Continue
        </Button>
        <p className="text-xs text-text-muted text-center">
          We&apos;ll send a 6-digit code to verify your number.
        </p>
        <p className="text-xs text-text-muted text-center pt-2">
          Dev hint: any 6-digit code works while <span className="font-mono">MOCK_OTP=true</span>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleOtp} className="space-y-4">
      <div className="text-sm text-text-secondary">
        Code sent to <span className="font-mono text-text-bright">{phone}</span>
      </div>
      <Input
        label="Enter the 6-digit code"
        type="text"
        inputMode="numeric"
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="123456"
        error={error ?? undefined}
        autoComplete="one-time-code"
        autoFocus
      />
      <Button type="submit" loading={loading} disabled={otp.length !== 6} fullWidth>
        Verify
      </Button>
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => { setStep('phone'); setOtp(''); setError(null); }}
          className="text-text-muted hover:text-text-primary underline"
        >
          Change number
        </button>
        <button
          type="button"
          onClick={async () => {
            try { await requestOtp(phone.trim()); } catch (err) { console.error(err); }
          }}
          className="text-brand hover:underline font-semibold"
        >
          Resend code
        </button>
      </div>
    </form>
  );
}