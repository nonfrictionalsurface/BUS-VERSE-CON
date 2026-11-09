import type { TextStyle } from 'react-native';

// Type scale from 05-UI-SPEC §4.2. Font families match Design_guide.html §1.
// Font loading happens in App.tsx (M0-C); these are the loaded family names.

export const FONT_SANS = 'PlusJakartaSans_400Regular';
export const FONT_SANS_MEDIUM = 'PlusJakartaSans_500Medium';
export const FONT_SANS_SEMIBOLD = 'PlusJakartaSans_600SemiBold';
export const FONT_SANS_BOLD = 'PlusJakartaSans_700Bold';
export const FONT_SANS_EXTRABOLD = 'PlusJakartaSans_800ExtraBold';
export const FONT_MONO = 'JetBrainsMono_700Bold';

type TypeStyle = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'>;

export const typography: Record<string, TypeStyle> = {
  hero: {
    fontFamily: FONT_SANS_EXTRABOLD,
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 53,
    letterSpacing: -1.4,
  },
  h2: {
    fontFamily: FONT_SANS_EXTRABOLD,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 37,
    letterSpacing: -0.6,
  },
  h3: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 29,
    letterSpacing: -0.3,
  },
  h4: {
    fontFamily: FONT_SANS_BOLD,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: FONT_SANS,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 25,
  },
  bodyMedium: {
    fontFamily: FONT_SANS_MEDIUM,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 25,
  },
  label: {
    fontFamily: FONT_SANS_SEMIBOLD,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  caption: {
    fontFamily: FONT_SANS_MEDIUM,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  monoData: {
    fontFamily: FONT_MONO,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
    letterSpacing: 0.2,
  },
  monoSmall: {
    fontFamily: FONT_MONO,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 0.3,
  },
};

export type Typography = typeof typography;
