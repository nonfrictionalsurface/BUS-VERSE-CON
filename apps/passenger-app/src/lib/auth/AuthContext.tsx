import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  api,
  setAccessToken,
  getAccessToken,
  setRefreshHandler,
  EP,
} from '../api';
import { wsManager } from '../ws';
import { sessionStorage } from './sessionStorage';
import type { AuthTokens, LoginResult, UserDTO } from '../../types';

interface AuthContextValue {
  user: UserDTO | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (result: LoginResult) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isReady, setIsReady] = useState(false);
  const refreshTokenRef = useRef<string | null>(null);

  // Wire the API client's refresh handler once.
  // IMPORTANT: on failure this MUST clear user state too, otherwise the app
  // sits in "isAuthenticated=true but every API 401s" zombie mode.
  useEffect(() => {
    setRefreshHandler(async () => {
      const refresh = refreshTokenRef.current ?? (await sessionStorage.getRefreshToken());
      if (!refresh) {
        setUser(null);
        return null;
      }
      try {
        const res = await api.post<AuthTokens>(EP.refresh('passenger'), { refreshToken: refresh });
        setAccessToken(res.accessToken);
        refreshTokenRef.current = res.refreshToken;
        await sessionStorage.setRefreshToken(res.refreshToken);
        wsManager.setTokens(res.accessToken, res.refreshToken);
        return res.accessToken;
      } catch {
        // Refresh definitively failed — session is dead. Clear state so UI shows sign-in.
        setAccessToken(null);
        refreshTokenRef.current = null;
        setUser(null);
        wsManager.disconnect();
        await sessionStorage.clearRefreshToken();
        return null;
      }
    });
  }, []);

  // Boot: try to restore session from stored refresh token.
  useEffect(() => {
    (async () => {
      try {
        const stored = await sessionStorage.getRefreshToken();
        if (!stored) {
          setIsReady(true);
          return;
        }
        refreshTokenRef.current = stored;
        const res = await api.post<AuthTokens>(EP.refresh('passenger'), { refreshToken: stored });
        setAccessToken(res.accessToken);
        refreshTokenRef.current = res.refreshToken;
        await sessionStorage.setRefreshToken(res.refreshToken);

        const me = await api.get<{
          userId: string;
          phone: string;
          email: string | null;
          emailVerified: boolean;
          name: string | null;
        }>(EP.me);
        setUser({
          id: me.userId,
          phone: me.phone,
          email: me.email,
          emailVerified: me.emailVerified,
          name: me.name,
        });
        wsManager.setTokens(res.accessToken, res.refreshToken);
        wsManager.connect();
      } catch {
        // Silent fail — user sees logged-out state
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const login = useCallback(async (result: LoginResult) => {
    setAccessToken(result.accessToken);
    refreshTokenRef.current = result.refreshToken;
    await sessionStorage.setRefreshToken(result.refreshToken);
    setUser(result.user);
    wsManager.setTokens(result.accessToken, result.refreshToken);
    wsManager.connect();
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post(EP.logout);
    } catch {
      // best-effort
    }
    setAccessToken(null);
    refreshTokenRef.current = null;
    await sessionStorage.clearRefreshToken();
    setUser(null);
    wsManager.disconnect();
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    const token = getAccessToken();
    if (token) return true;
    const stored = refreshTokenRef.current ?? (await sessionStorage.getRefreshToken());
    if (!stored) return false;
    try {
      const res = await api.post<AuthTokens>(EP.refresh('passenger'), { refreshToken: stored });
      setAccessToken(res.accessToken);
      refreshTokenRef.current = res.refreshToken;
      await sessionStorage.setRefreshToken(res.refreshToken);
      wsManager.setTokens(res.accessToken, res.refreshToken);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isReady,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}