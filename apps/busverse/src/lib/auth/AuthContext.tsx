'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { wsManager } from '../ws/socket';
import { UserSession } from '../api/types';

interface AuthContextValue {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithTokens: (tokens: { accessToken: string; refreshToken: string; user: UserSession }) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = async () => {
    const token = localStorage.getItem('busverse_access_token');
    const cachedUser = localStorage.getItem('busverse_user');

    if (token) {
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          // ignore corrupted cache
        }
      }
      wsManager.connect(token);

      try {
        const res = await api.get<{ user: UserSession }>('/passenger/me');
        setUser(res.data.user);
        localStorage.setItem('busverse_user', JSON.stringify(res.data.user));
      } catch (err) {
        console.warn('Silent session validation fallback', err);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initAuth();

    const handleLogout = () => {
      setUser(null);
      wsManager.disconnect();
    };

    window.addEventListener('busverse:auth:logout', handleLogout);
    return () => window.removeEventListener('busverse:auth:logout', handleLogout);
  }, []);

  const loginWithTokens = (tokens: { accessToken: string; refreshToken: string; user: UserSession }) => {
    localStorage.setItem('busverse_access_token', tokens.accessToken);
    localStorage.setItem('busverse_refresh_token', tokens.refreshToken);
    localStorage.setItem('busverse_user', JSON.stringify(tokens.user));
    setUser(tokens.user);
    wsManager.connect(tokens.accessToken);
  };

  const logout = async () => {
    try {
      await api.post('/passenger/auth/logout');
    } catch {
      // Best-effort logout
    } finally {
      localStorage.removeItem('busverse_access_token');
      localStorage.removeItem('busverse_refresh_token');
      localStorage.removeItem('busverse_user');
      setUser(null);
      wsManager.disconnect();
    }
  };

  const refreshProfile = async () => {
    const res = await api.get<{ user: UserSession }>('/passenger/me');
    setUser(res.data.user);
    localStorage.setItem('busverse_user', JSON.stringify(res.data.user));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithTokens,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
