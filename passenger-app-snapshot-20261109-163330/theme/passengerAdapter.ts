/**
 * Safe theme adapter. The existing ThemeContext might return:
 *   - { theme, mode, setMode, cycleMode }  (like driver-app)
 *   - { theme }                            (theme direct)
 *   - theme directly                       (colors object)
 * This adapter normalizes to a stable `{ isDark, colors }` shape.
 */
import { useTheme } from './ThemeContext';

const FALLBACK = {
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
};

export function useCleanTheme(): typeof FALLBACK {
  try {
    const ctx: any = useTheme();
    const theme = ctx?.theme ?? ctx;
    if (theme?.colors) {
      return {
        isDark: !!theme.isDark,
        colors: {
          bg: theme.colors.bg ?? FALLBACK.colors.bg,
          surface: theme.colors.surface ?? FALLBACK.colors.surface,
          surfaceElevated: theme.colors.surfaceElevated ?? theme.colors.surface ?? FALLBACK.colors.surfaceElevated,
          border: theme.colors.border ?? FALLBACK.colors.border,
          borderSubtle: theme.colors.borderSubtle ?? theme.colors.border ?? FALLBACK.colors.borderSubtle,
          primary: theme.colors.primary ?? FALLBACK.colors.primary,
          primaryDim: theme.colors.primaryDim ?? theme.colors.primary ?? FALLBACK.colors.primaryDim,
          text: theme.colors.text ?? FALLBACK.colors.text,
          textMuted: theme.colors.textMuted ?? FALLBACK.colors.textMuted,
          danger: theme.colors.danger ?? FALLBACK.colors.danger,
          warning: theme.colors.warning ?? FALLBACK.colors.warning,
          success: theme.colors.success ?? FALLBACK.colors.success,
        },
      };
    }
  } catch (e) {
    console.warn('[useCleanTheme] theme context unavailable, using fallback:', e);
  }
  return FALLBACK;
}