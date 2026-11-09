/**
 * Theme adapter for screens ported from the driver-app era. Maps the real
 * BusVerse BrandTokens (royal blue, navy, cyan) onto the flat `colors` shape
 * those screens expect.
 *
 * DO NOT reintroduce a hardcoded fallback palette — that is what made the seat
 * deck render in the driver-app amber/brown. If you need a color, add it to
 * BrandTokens in tokens.ts and map it here.
 */
import { useTheme } from './ThemeContext';

export function useCleanTheme() {
  const { tokens, theme } = useTheme();
  const isDark = theme === 'dark';
  return {
    isDark,
    colors: {
      bg: tokens.canvasBg,
      surface: tokens.surfaceCard,
      surfaceElevated: tokens.surfaceElevated,
      border: tokens.borderSubtle,
      borderSubtle: tokens.borderHairline,
      primary: tokens.brandPrimary,
      primaryDim: tokens.brandPrimaryHover,
      text: tokens.textPrimary,
      textMuted: tokens.textMuted,
      danger: tokens.dangerCrimson,
      warning: tokens.warningAmber,
      success: tokens.signalEmerald,
    },
  };
}