'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { UserSession, Surface, ApiError } from '../api/types';
import { DEMO } from '../config';

function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

interface AuthCtx {
  user: UserSession | null;
  surface: Surface | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginOperator: (email: string, password: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  switchDemoRole: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [surface, setSurface] = useState<Surface | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem('buscon_access_token');
      const userJson = localStorage.getItem('buscon_user');
      const savedSurface = localStorage.getItem('buscon_surface') as Surface | null;
      if (token && userJson && savedSurface) {
        const storedUser = JSON.parse(userJson);
        // Re-decode role in case it was missing in a previous session
        const payload = decodeJwtPayload(token);
        const role = payload?.role || storedUser.role || (savedSurface === 'admin' ? 'SUPER_ADMIN' : 'OPERATOR_OWNER');
        setUser({ ...storedUser, role });
        setSurface(savedSurface);
        api.setSurface(savedSurface);
      }
    } catch { /* ignore */ } finally { setIsLoading(false); }

    const onLogout = () => { setUser(null); setSurface(null); };
    window.addEventListener('buscon:auth:logout', onLogout);
    return () => window.removeEventListener('buscon:auth:logout', onLogout);
  }, []);

  const doLogin = useCallback(async (surfaceParam: Surface, email: string, password: string) => {
    console.log('[AC] doLogin entry', { surfaceParam, emailLen: email.length, pwdLen: password.length, email });
    api.setSurface(surfaceParam);
    const res = await api.post<{
      accessToken: string; refreshToken: string; expiresAt: string; user: UserSession;
    }>(`/${surfaceParam}/auth/login`, { email, password }, { skipAuth: true });

    console.log('[AC] doLogin HTTP OK', { hasToken: !!(res as any)?.data?.accessToken, dataKeys: Object.keys((res as any)?.data ?? {}) });
    const { accessToken, refreshToken, user: u } = res.data;
    
    // Decode JWT to extract role reliably
    const payload = decodeJwtPayload(accessToken);
    const role = payload?.role || payload?.userRole || payload?.user?.role || u.role || 
      (surfaceParam === 'admin' ? 'SUPER_ADMIN' : 'OPERATOR_OWNER');
    
    const userWithRole: UserSession = { ...u, role };

    localStorage.setItem('buscon_access_token', accessToken);
    localStorage.setItem('buscon_refresh_token', refreshToken);
    localStorage.setItem('buscon_user', JSON.stringify(userWithRole));
    console.log('[AC] doLogin COMMIT', { role, userId: userWithRole.id, email: userWithRole.email });
    setUser(userWithRole);
    setSurface(surfaceParam);
  }, []);

  const loginOperator = useCallback((email: string, password: string) => doLogin('operator', email, password), [doLogin]);
  const loginAdmin = useCallback((email: string, password: string) => doLogin('admin', email, password), [doLogin]);

  // Compute isAdmin from either surface or role (defensive — covers all cases)
  const isAdmin = surface === 'admin' || user?.role === 'SUPER_ADMIN';

  const switchDemoRole = useCallback(async () => {
    if (isAdmin) {
      if (!DEMO.operatorEmail || !DEMO.operatorPassword) throw new ApiError(400, { code: 'DEMO_NOT_CONFIGURED', message: 'Demo credentials missing in .env.local' });
      await doLogin('operator', DEMO.operatorEmail, DEMO.operatorPassword);
    } else {
      if (!DEMO.adminEmail || !DEMO.adminPassword) throw new ApiError(400, { code: 'DEMO_NOT_CONFIGURED', message: 'Demo credentials missing in .env.local' });
      await doLogin('admin', DEMO.adminEmail, DEMO.adminPassword);
    }
  }, [isAdmin, doLogin]);

  const logout = useCallback(async () => {
    try { await api.post(`/${surface}/auth/logout`, {}); } catch { /* ignore */ }
    localStorage.removeItem('buscon_access_token');
    localStorage.removeItem('buscon_refresh_token');
    localStorage.removeItem('buscon_user');
    localStorage.removeItem('buscon_surface');
    api.setSurface(null);
    setUser(null);
    setSurface(null);
  }, [surface]);

  return (
    <Ctx.Provider value={{
      user, surface, isAdmin, isLoading,
      isAuthenticated: !!user,
      loginOperator, loginAdmin, switchDemoRole, logout,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}