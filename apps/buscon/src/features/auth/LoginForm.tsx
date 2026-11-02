'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Bus, Mail, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { isApiError, getErrorMessage } from '@/lib/api/errors';
import { CONFIG, DEMO } from '@/lib/config';
import { BusConLogo } from '@/components/brand/BusConLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { devVerifyAndApprove } from './verifyApi';

type Mode = 'operator' | 'admin';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { loginOperator, loginAdmin } = useAuth();
  const [mode, setMode] = useState<Mode>('operator');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notVerifiedEmail, setNotVerifiedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const returnTo = params.get('returnTo') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin();
  };

  const doLogin = async () => {
    console.log('[LF/doLogin] ENTERED', { mode, emailLen: email.length, pwdLen: password.length, email, hasAt: email.includes('@') });
    setError(null);
    setNotVerifiedEmail(null);
    setVerifyMsg(null);
    setLoading(true);
    try {
      console.log('[LF/doLogin] calling login...');
      if (mode === 'admin') await loginAdmin(email, password);
      else await loginOperator(email, password);
      console.log('[LF/doLogin] login returned OK, pushing to', returnTo);
      router.push(returnTo);
    } catch (err) {
      console.error('[LF/doLogin] CAUGHT', { status: (err as any)?.status, code: (err as any)?.code, message: (err as any)?.message, raw: err });
      if (isApiError(err) && err.code === 'EMAIL_NOT_VERIFIED') {
        setNotVerifiedEmail(email);
        setError('Please verify your email address before signing in.');
      } else if (isApiError(err) && (err.code === 'ACCOUNT_PENDING_APPROVAL' || err.code === 'OPERATOR_NOT_APPROVED')) {
        setNotVerifiedEmail(email);
        setError('Your account is pending admin approval.');
      } else {
        setError(isApiError(err) ? getErrorMessage(err.code, err.message) : 'Sign in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (which: Mode) => {
    setError(null);
    setNotVerifiedEmail(null);
    setLoading(true);
    try {
      if (which === 'admin') {
        if (!DEMO.adminEmail || !DEMO.adminPassword) throw new Error('Demo admin credentials missing in .env.local');
        await loginAdmin(DEMO.adminEmail, DEMO.adminPassword);
      } else {
        if (!DEMO.operatorEmail || !DEMO.operatorPassword) throw new Error('Demo operator credentials missing in .env.local');
        await loginOperator(DEMO.operatorEmail, DEMO.operatorPassword);
      }
      router.push(returnTo);
    } catch (err) {
      setError(isApiError(err) ? getErrorMessage(err.code, err.message) : (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDevVerify = async () => {
    if (!notVerifiedEmail) return;
    setVerifying(true);
    setVerifyMsg(null);
    const result = await devVerifyAndApprove(notVerifiedEmail);
    setVerifyMsg(result.message);
    setVerifying(false);
    if (result.ok) {
      // Auto-retry login after a brief delay so user sees the success message
      setTimeout(async () => {
        setError(null);
        setNotVerifiedEmail(null);
        setLoading(true);
        try {
          if (mode === 'admin') await loginAdmin(email, password);
          else await loginOperator(email, password);
          router.push(returnTo);
        } catch (err) {
          setError(isApiError(err) ? getErrorMessage(err.code, err.message) : 'Login failed after verify.');
          setLoading(false);
        }
      }, 600);
    }
  };

  const demoReady = !!(DEMO.operatorEmail && DEMO.operatorPassword && DEMO.adminEmail && DEMO.adminPassword);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-bg p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <BusConLogo />
        </div>
        <h1 className="text-2xl font-bold text-center text-ink-bright mb-1">Sign in to BusCon</h1>
        <p className="text-sm text-center text-ink-secondary mb-8">
          {mode === 'operator' ? 'Manage your fleet operations' : 'Platform oversight and admin'}
        </p>

        <div className="flex bg-surface-sunken rounded-lg p-1 mb-5">
          {(['operator', 'admin'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); setNotVerifiedEmail(null); setVerifyMsg(null); }}
              className={
                'flex-1 py-2 rounded-md text-sm font-medium transition-colors ' +
                (mode === m
                  ? 'bg-surface-card text-ink-primary shadow-sm border border-line-hairline'
                  : 'text-ink-secondary hover:text-ink-primary')
              }
            >
              {m === 'operator' ? 'Operator' : 'Admin'}
            </button>
          ))}
        </div>

        {CONFIG.DEMO_MODE && (
          <div className="mb-6">
            <div className="text-[11px] uppercase tracking-wider text-ink-muted font-bold mb-2">
              Demo Accounts
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => handleDemo('operator')} disabled={loading || !demoReady}>
                <Sparkles size={14} className="text-brand" /> As Operator
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => handleDemo('admin')} disabled={loading || !demoReady}>
                <Sparkles size={14} className="text-brand" /> As Admin
              </Button>
            </div>
          </div>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line-hairline" /></div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-canvas-bg text-ink-muted font-medium uppercase tracking-wider">Or sign in manually</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />

          {error && (
            <div role="alert" className="p-3 rounded-lg text-sm bg-danger-crimson/10 text-danger-crimson font-medium border border-danger-crimson/20">
              {error}
            </div>
          )}

          {notVerifiedEmail && CONFIG.IS_DEV && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-500">
                <Mail size={18} className="shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold">Verification + approval bypass (DEV)</p>
                  <p className="mt-1">
                    One click to mark <strong>{notVerifiedEmail}</strong> verified and auto-approve the operator.
                  </p>
                </div>
              </div>

              {verifyMsg && (
                <p className="text-xs text-ink-secondary p-2 rounded bg-surface-card border border-line-hairline">
                  {verifyMsg}
                </p>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleDevVerify}
                loading={verifying}
                className="w-full bg-brand hover:bg-brand-hover"
              >
                {verifying ? (
                  <><Loader2 size={14} className="mr-1.5 animate-spin" /> Verifying…</>
                ) : (
                  <><ExternalLink size={14} className="mr-1.5" /> Dev: auto-verify &amp; log in</>
                )}
              </Button>

              <div className="flex items-start gap-2 text-[10px] text-ink-muted pt-2 border-t border-amber-500/20">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>
                  If the button fails, the backend route isn't registered. Check the API terminal
                  for the registration instruction.
                </span>
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-11 text-base">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-line-hairline text-center">
          <p className="text-sm text-ink-secondary mb-3">New to BusVerse?</p>
          <Link href="/signup" className="inline-flex items-center gap-2 text-sm font-bold text-brand-text hover:text-brand-hover transition-colors">
            <Bus size={16} />
            Register your bus fleet
          </Link>
        </div>
      </div>
    </div>
  );
}