import Animated from 'react-native-reanimated';
import type { ComponentType } from 'react';
import type { ViewStyle } from 'react-native';

// react-native-svg v16 component types don't declare `style` or `animatedProps`,
// but Reanimated's createAnimatedComponent() supplies both at runtime. The CSS
// error "Failed to set indexed property [0] on CSSStyleDeclaration" on web comes
// from passing `style` to animated SVG elements — always use `animatedProps` with
// a matrix transform string instead.

export type AnimatedSvgComponent<P> = ComponentType<
  P & {
    style?: ViewStyle | ViewStyle[] | ((...args: unknown[]) => ViewStyle);
    animatedProps?: Record<string, unknown>;
  }
>;

export function makeAnimatedSvg<P>(
  Component: ComponentType<P>,
): AnimatedSvgComponent<P> {
  return Animated.createAnimatedComponent(Component) as unknown as AnimatedSvgComponent<P>;
}

// ── Transform matrix builders ──
// matrix(a, b, c, d, e, f) maps (x, y) → (a*x + c*y + e, b*x + d*y + f).
// SVG applies the matrix with transform-origin 0 0 on every platform, so
// these are portable across native (react-native-svg) and web (react-native-web).

/** Rotate by `deg` around (cx, cy), then translate the result by (X, Y). */
export function rotateMatrix(X: number, Y: number, deg: number, cx: number, cy: number): string {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const e = X - cx * cos + cy * sin;
  const f = Y - cx * sin - cy * cos;
  return `matrix(${cos},${sin},${-sin},${cos},${e},${f})`;
}

/** Scale by (sx, sy) around (cx, cy), then translate the result by (X, Y). */
export function scaleMatrix(X: number, Y: number, sx: number, sy: number, cx: number, cy: number): string {
  return `matrix(${sx},0,0,${sy},${X - cx * sx},${Y - cy * sy})`;
}

/** Translate by (tx, ty). */
export function translateMatrix(tx: number, ty: number): string {
  return `matrix(1,0,0,1,${tx},${ty})`;
}