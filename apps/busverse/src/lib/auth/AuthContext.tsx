'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { wsManager } from '../ws/socket';
import { UserSession } from '../api/types';

interface AuthContextType {
  user: UserSession | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requestOtp: (phone: string, intent?: 'SIGNUP' | 'LOGIN') => Promise<{ expiresInSeconds: number }>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize authentication tokens & user state from localStorage on client load
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('busverse_access_token');
      const storedUser = localStorage.getItem('busverse_user');

      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
        wsManager.connect(storedToken);
      }
    } catch (e) {
      console.error('Failed to parse local authentication cache:', e);
    } finally {
      setIsLoading(false);
    }

    const handleLogoutEvent = () => {
      setUser(null);
      setAccessToken(null);
      wsManager.disconnect();
    };

    window.addEventListener('busverse:auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('busverse:auth:logout', handleLogoutEvent);
  }, []);

  const requestOtp = useCallback(async (phone: string, intent: 'SIGNUP' | 'LOGIN' = 'LOGIN') => {
    const res = await api.post<{ expiresInSeconds: number }>(
      '/passenger/auth/otp/request',
      { phone, intent },
      { skipAuth: true }
    );
    return res.data;
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
      user: UserSession;
    }>(
      '/passenger/auth/otp/verify',
      { phone, otp },
      { skipAuth: true }
    );

    const { accessToken: newAccess, refreshToken: newRefresh, user: newUser } = res.data;

    localStorage.setItem('busverse_access_token', newAccess);
    localStorage.setItem('busverse_refresh_token', newRefresh);
    localStorage.setItem('busverse_user', JSON.stringify(newUser));

    setAccessToken(newAccess);
    setUser(newUser);
    wsManager.connect(newAccess);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        await api.post('/passenger/auth/logout', {});
      }
    } catch {
      // Local clean-up proceeds even if server revoking network fails
    } finally {
      localStorage.removeItem('busverse_access_token');
      localStorage.removeItem('busverse_refresh_token');
      localStorage.removeItem('busverse_user');
      setUser(null);
      setAccessToken(null);
      wsManager.disconnect();
    }
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        requestOtp,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
