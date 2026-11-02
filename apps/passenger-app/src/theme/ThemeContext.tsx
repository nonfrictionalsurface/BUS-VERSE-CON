import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { brandTokens, BrandTokens, ThemeMode } from './tokens';
import { typography, Typography } from './typography';
import { spacing, radius, Spacing, Radius } from './spacing';
import { motion, Motion } from './motion';

const THEME_STORAGE_KEY = '@busverse/theme';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;              // resolved theme actually rendered
  preference: ThemePreference;   // what the user chose (system = follow OS)
  tokens: BrandTokens;
  typography: Typography;
  spacing: Spacing;
  radius: Radius;
  motion: Motion;
  toggleTheme: () => void;
  setPreference: (pref: ThemePreference) => void;
  isReady: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveTheme(pref: ThemePreference, system: 'light' | 'dark' | null | undefined): ThemeMode {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return system === 'light' ? 'light' : 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  // Restore saved preference on mount. Per 05-UI-SPEC §22.2, dark is the
  // first-run default; system-follow applies until the user picks explicitly.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      } catch {
        /* storage failure = fall back to 'system' */
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {
      /* non-fatal: preference will re-fall back on next launch */
    });
  }, []);

  const theme = resolveTheme(preference, systemScheme);
  const tokens = brandTokens[theme];

  const toggleTheme = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setPreference]);

  const value: ThemeContextValue = {
    theme,
    preference,
    tokens,
    typography,
    spacing,
    radius,
    motion,
    toggleTheme,
    setPreference,
    isReady,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
