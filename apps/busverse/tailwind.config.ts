import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--canvas-bg)',
          subtle: 'var(--canvas-subtle)',
        },
        surface: {
          card: 'var(--surface-card)',
          elevated: 'var(--surface-elevated)',
          hover: 'var(--surface-hover)',
          active: 'var(--surface-active)',
          sunken: 'var(--surface-sunken)',
        },
        ink: {
          bright: 'var(--text-bright)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          brand: 'var(--text-brand)',
        },
        border: {
          hairline: 'var(--border-hairline)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },
        brand: {
          primary: 'var(--brand-primary)',
          hover: 'var(--brand-primary-hover)',
          subtle: 'var(--brand-primary-subtle)',
          border: 'var(--brand-primary-border)',
        },
        telemetry: {
          cyan: 'var(--telemetry-cyan)',
          subtle: 'var(--telemetry-cyan-subtle)',
        },
        signal: {
          emerald: 'var(--signal-emerald)',
          subtle: 'var(--signal-emerald-subtle)',
        },
        warning: {
          amber: 'var(--warning-amber)',
          subtle: 'var(--warning-amber-subtle)',
        },
        danger: {
          crimson: 'var(--danger-crimson)',
          subtle: 'var(--danger-crimson-subtle)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        ambient: 'var(--shadow-ambient)',
        floating: 'var(--shadow-floating)',
        modal: 'var(--shadow-modal)',
        glow: 'var(--shadow-glow-primary)',
      },
    },
  },
  plugins: [],
};

export default config;
