import { useTheme } from './ThemeContext';

export function useCleanTheme() {
  return useTheme().theme;
}