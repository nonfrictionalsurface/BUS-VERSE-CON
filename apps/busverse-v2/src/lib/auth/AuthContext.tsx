'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { api, setAccessToken, setUnauthorizedHandler, ApiError } from '@/lib/api/client';

export interface AuthUser {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  emailVerified?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  requestOtp: (phone: string) => Promise<number>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const Ctx = createContext<AuthState | undefined>(undefined);

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt?: string;
  user: AuthUser;
}

const ALREADY_REGISTERED_CODES = new Set([
  'PHONE_ALREADY_REGISTERED',
  'EMAIL_ALREADY_REGISTERED',
  'USER_ALREADY_EXISTS',
  'ALREADY_REGISTERED',
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      console.warn('[session] invalidated — user logged out');
      setAccessToken(null);
      setUser(null);
      // Do NOT remove bv_refresh_token — allows re-login without friction
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('bv_refresh_token') : null;
      if (!refreshToken) {
        console.log('[session] no refresh token — starting logged-out');
        if (!cancelled) setLoading(false);
        return;
      }

      console.log('[session] restoring from refresh token…');
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE ?? '/api/v1'}/passenger/auth/refresh`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          },
        );

        if (res.status === 401 || res.status === 403) {
          console.warn('[session] refresh rejected — token invalid, keeping for re-login');
          if (!cancelled) setLoading(false);
          return;
        }

        if (!res.ok) {
          console.warn('[session] refresh transient failure:', res.status, '— keeping token');
          if (!cancelled) setLoading(false);
          return;
        }

        const payload = await res.json();
        const data = payload?.data ?? payload;
        if (cancelled) return;

        setAccessToken(data.accessToken);
        localStorage.setItem('bv_refresh_token', data.refreshToken);
        setUser(data.user);
        console.log('[session] ✅ restored:', data.user?.phone);
      } catch (err) {
        console.warn('[session] refresh network error — keeping token:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const requestOtp = useCallback(async (phone: string): Promise<number> => {
    console.log('[auth] trying SIGNUP intent…');
    try {
      const data = await api.post<{ expiresInSeconds: number }>(
        '/passenger/auth/otp/request',
        { phone, intent: 'SIGNUP' },
        {
          skipAuth: true,
          expectedCodes: ['PHONE_ALREADY_REGISTERED'], // expected — will fall back to LOGIN
        },
      );
      console.log('[auth] 🟢 SIGNUP succeeded');
      return data.expiresInSeconds;
    } catch (signupErr) {
      const err = signupErr as ApiError;
      if (!ALREADY_REGISTERED_CODES.has(err.code)) {
        console.warn('[auth] 🔴 SIGNUP failed (unexpected):', err.code);
        throw err;
      }
      console.log('[auth] 🟡 SIGNUP rejected (phone exists), trying LOGIN intent…');

      try {
        const data = await api.post<{ expiresInSeconds: number }>(
          '/passenger/auth/otp/request',
          { phone, intent: 'LOGIN' },
          { skipAuth: true },
        );
        console.log('[auth] 🟢 LOGIN succeeded');
        return data.expiresInSeconds;
      } catch (loginErr) {
        const lerr = loginErr as ApiError;
        console.warn('[auth] 🔴 LOGIN also failed:', lerr.code);
        if (lerr.code === 'PHONE_NOT_REGISTERED') {
          throw new Error('That phone is not registered. Try the signup flow.');
        }
        throw lerr;
      }
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    const data = await api.post<AuthResponse>(
      '/passenger/auth/otp/verify',
      { phone, otp },
      { skipAuth: true, expectedCodes: ['INVALID_OTP', 'OTP_EXPIRED'] },
    );
    setAccessToken(data.accessToken);
    localStorage.setItem('bv_refresh_token', data.refreshToken);
    setUser(data.user);
    console.log('[session] ✅ logged in:', data.user?.phone);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/passenger/auth/logout', {}); } catch { /* best effort */ }
    setAccessToken(null);
    if (typeof window !== 'undefined') localStorage.removeItem('bv_refresh_token');
    setUser(null);
    console.log('[session] logged out');
  }, []);

  return (
    <Ctx.Provider value={{
      user,
      loading,
      requestOtp,
      verifyOtp,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}