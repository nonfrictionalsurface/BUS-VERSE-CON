'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Building2, CheckCircle2, ShieldCheck, Lock, Dices,
  ArrowRight, Sparkles, Loader2
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { isApiError, getErrorMessage } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/AuthContext';
import { CONFIG } from '@/lib/config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { devVerifyAndApprove } from './verifyApi';
import * as R from '@/lib/utils/random';

function DiceBtn({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1.5 rounded-md text-ink-muted hover:text-brand-text hover:bg-brand/10 transition-colors"
      title={title}
      aria-label={title}
    >
      <Dices size={14} />
    </button>
  );
}

export function SignupForm() {
  const router = useRouter();
  const { loginOperator } = useAuth();
  const [formData, setFormData] = useState({
    companyName: '',
    gstin: '',
    pan: '',
    email: '',
    phone: '+91',
    password: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [devMessage, setDevMessage] = useState<string | null>(null);

  const cleanAlnum = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const validate = () => {
    const gstin = formData.gstin.trim().toUpperCase();
    const pan = formData.pan.trim().toUpperCase();

    if (formData.companyName.trim().length < 2) return 'Company name is too short.';
    if (gstin.length !== 15) return `GSTIN must be exactly 15 characters. You entered ${gstin.length}.`;
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return 'GSTIN format is wrong. Must look like: 09AAACH7409R1ZZ.';
    if (pan.length !== 10) return `PAN must be exactly 10 characters. You entered ${pan.length}.`;
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return 'PAN format is wrong. Must look like: AAACH7409R.';
    if (formData.phone.length < 12) return 'Phone must include country code (e.g., +919876543210).';
    if (formData.password.length < 12) return 'Password must be at least 12 characters.';
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) return 'Password must contain both letters and numbers.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) { setError(v); return; }

    setLoading(true);
    try {
      await api.post('/operator/auth/signup', {
        companyName: formData.companyName.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        pan: formData.pan.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
      }, { skipAuth: true });
      setSuccess(true);
    } catch (err) {
      if (isApiError(err)) setError(getErrorMessage(err.code, err.message));
      else setError('Signup failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const randomizeGstin = () => {
    const existingPan = formData.pan.trim().toUpperCase();
    const pan = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(existingPan) ? existingPan : R.generatePAN();
    const { gstin } = R.generateGSTIN(pan);
    setFormData(f => ({ ...f, gstin, pan }));
  };

  const randomizePan = () => {
    const pan = R.generatePAN();
    const { gstin } = R.generateGSTIN(pan);
    setFormData(f => ({ ...f, pan, gstin }));
  };

  // ---- Dev flow: skip email verify + admin approval, log in immediately ----
  const handleDevLogin = async () => {
    setDevMessage(null);
    setDevLoading(true);
    try {
      const result = await devVerifyAndApprove(formData.email.trim().toLowerCase());
      if (!result.ok) {
        setDevMessage(result.message);
        setDevLoading(false);
        return;
      }
      setDevMessage('Verified + approved. Logging in…');

      // Log in with the password they just set
      await loginOperator(formData.email.trim().toLowerCase(), formData.password);
      router.push('/dashboard');
    } catch (err) {
      if (isApiError(err)) setDevMessage(getErrorMessage(err.code, err.message));
      else setDevMessage('Login after auto-approve failed. Try the Sign in page.');
      setDevLoading(false);
    }
  };

  // ---------- Success state ----------
  if (success) {
    return (
      <div className="w-full max-w-lg animate-in fade-in zoom-in-95">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 size={40} className="text-brand-text" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-ink-bright mb-3">Application Submitted</h1>
          <p className="text-sm text-ink-secondary">
            Thank you for registering <strong className="text-ink-bright">{formData.companyName}</strong>.
            Our admin team will review your KYC documents.
          </p>
        </div>

        <Card className="bg-amber-500/5 border-amber-500/20 mb-6">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-500">Production flow</p>
              <p className="text-xs text-amber-600/80 mt-1 leading-relaxed">
                In a real deployment: an email verification link arrives, you click it, admin reviews
                your KYC, and you receive an approval email — usually within 24 hours.
              </p>
            </div>
          </div>
        </Card>

        {CONFIG.IS_DEV && (
          <Card className="mb-6 border-2 border-signal-emerald/30 bg-signal-emerald/5">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles size={20} className="text-brand-text shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-ink-bright">Demo / Evaluation Mode</p>
                <p className="text-xs text-ink-secondary mt-1">
                  Skip verification + admin approval and log in immediately.
                  Creates an audit log entry so admin can see what happened.
                </p>
              </div>
            </div>
            {devMessage && (
              <div className="mb-3 p-2.5 rounded-md bg-surface-card border border-line-hairline text-xs text-ink-primary">
                {devMessage}
              </div>
            )}
            <Button
              onClick={handleDevLogin}
              loading={devLoading}
              disabled={devLoading}
              className="w-full h-11 bg-brand hover:bg-brand-hover"
            >
              {devLoading ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Verifying…</>
              ) : (
                <><Sparkles size={16} className="mr-2" /> Log in now (skip approval)</>
              )}
            </Button>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          <Link href="/login">
            <Button variant="secondary" className="w-full">
              Or wait for admin approval <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
          <p className="text-[11px] text-ink-muted text-center mt-1">
            To test the manual approval path: sign in as admin → Approvals → approve this operator.
          </p>
        </div>
      </div>
    );
  }

  // ---------- Main form ----------
  return (
    <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <Link href="/login" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-text mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Sign in
        </Link>
        <h1 className="text-3xl font-bold text-ink-bright tracking-tight">Register your bus</h1>
        <p className="text-sm text-ink-secondary mt-2">Join BusVerse to list your fleet and reach thousands of passengers.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div role="alert" className="p-4 rounded-lg bg-danger-crimson/10 border border-danger-crimson/30 text-danger-crimson text-sm font-medium leading-relaxed">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted border-b border-line-hairline pb-2 flex items-center gap-2">
            <Building2 size={14} /> Company Details
          </h2>

          <Input
            name="companyName"
            label="Registered Company Name"
            placeholder="Sharma Travels Pvt Ltd"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                name="gstin"
                label="GSTIN (15 chars)"
                placeholder="09AAACH7409R1ZZ"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: cleanAlnum(e.target.value).slice(0, 15) })}
                maxLength={15}
                required
                trailing={<DiceBtn onClick={randomizeGstin} title="Generate random valid GSTIN (embeds current PAN)" />}
              />
              <p className="text-[10px] text-ink-muted mt-1 leading-tight">
                2 digits · 5 letters · 4 digits · 1 letter · 1 alnum · Z · 1 alnum
              </p>
            </div>
            <div>
              <Input
                name="pan"
                label="PAN (10 chars)"
                placeholder="AAACH7409R"
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: cleanAlnum(e.target.value).slice(0, 10) })}
                maxLength={10}
                required
                trailing={<DiceBtn onClick={randomizePan} title="Generate random valid PAN (also updates GSTIN)" />}
              />
              <p className="text-[10px] text-ink-muted mt-1 leading-tight">
                5 letters · 4 digits · 1 letter
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted border-b border-line-hairline pb-2 flex items-center gap-2">
            <Lock size={14} /> Account &amp; Login
          </h2>

          <Input
            name="email"
            label="Work Email"
            type="email"
            placeholder="founder@sharmatravels.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            name="phone"
            label="Phone Number"
            type="tel"
            placeholder="+919876543210"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />

          <div>
            <Input
              name="password"
              label="Password"
              type="password"
              placeholder="At least 12 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <p className="text-[10px] text-ink-muted mt-1 leading-tight">
              At least 12 characters, must include letters and numbers.
            </p>
          </div>
        </div>

        <Button type="submit" className="w-full h-12 text-base mt-2" loading={loading}>
          Submit Application
        </Button>
      </form>
    </div>
  );
}