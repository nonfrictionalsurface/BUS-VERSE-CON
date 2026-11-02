import React, { createContext, useContext, useState, useEffect } from 'react';
import { setToken, getToken } from '../api/client';
import * as authApi from '../api/auth.api';

const Ctx = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          try {
            const me = await authApi.fetchDriverMe();
            setUser(me);
          } catch (e) {
            console.log('fetchDriverMe failed:', e);
          }
        }
      } catch (e) {
        console.log('getToken failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (phone: string, otp: string) => {
    const res = await authApi.verifyOtp(phone, otp, 'demo-device-fingerprint');
    await setToken(res.accessToken);
    setUser(res.user);
  };

  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};