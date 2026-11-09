export type ThemeMode = 'auto' | 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  primary: string;
  primaryDim: string;
  text: string;
  textMuted: string;
  danger: string;
  warning: string;
  success: string;
}

export interface Theme {
  isDark: boolean;
  colors: ThemeColors;
}

export const brandTokens = {
  light: {
    isDark: false,
    colors: {
      bg: '#FAF8F5',
      surface: '#FFFFFF',
      surfaceElevated: '#F2EDE6',
      border: '#E6DFD6',
      borderSubtle: '#EFECE6',
      primary: '#C48787',
      primaryDim: '#B07070',
      text: '#2E2620',
      textMuted: '#7A6B5F',
      danger: '#D16A6A',
      warning: '#D8A860',
      success: '#4CAF50',
    },
  },
  dark: {
    isDark: true,
    colors: {
      bg: '#1A1410',
      surface: '#251C16',
      surfaceElevated: '#2E251E',
      border: '#3D2E22',
      borderSubtle: '#2B2118',
      primary: '#F59E0B',
      primaryDim: '#D97706',
      text: '#FEF9F3',
      textMuted: '#C4A57B',
      danger: '#EF4444',
      warning: '#FCD34D',
      success: '#4ADE80',
    },
  },
} as const;