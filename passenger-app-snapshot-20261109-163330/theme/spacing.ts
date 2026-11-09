// 8pt grid from 05-UI-SPEC §4.3 (matches Design_guide.html §1 --space-* tokens).
// Every spacing value in the app is a multiple of 4. Nothing below 2px.

export const spacing = {
  '4xs': 2,
  '3xs': 4,
  '2xs': 8,
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 9999,
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;
