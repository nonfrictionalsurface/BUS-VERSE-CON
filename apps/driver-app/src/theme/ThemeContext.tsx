import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { brandTokens, ThemeMode, Theme } from './brandTokens';

const STORAGE_KEY = 'theme_mode';

interface ThemeCtx {
  mode: ThemeMode;
  theme: Theme;
  setMode: (m: ThemeMode) => void;
  cycleMode: () => void;
}

const Ctx = createContext<ThemeCtx | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'auto') {
          setModeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const theme = useMemo(() => {
    const resolved =
      mode === 'auto' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
    return resolved === 'dark' ? (brandTokens.dark as Theme) : (brandTokens.light as Theme);
  }, [mode, systemScheme]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    SecureStore.setItemAsync(STORAGE_KEY, m).catch(() => {});
  }, []);

  const cycleMode = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode =
        prev === 'auto' ? 'light' : prev === 'light' ? 'dark' : 'auto';
      SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ mode, theme, setMode, cycleMode }),
    [mode, theme, setMode, cycleMode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}