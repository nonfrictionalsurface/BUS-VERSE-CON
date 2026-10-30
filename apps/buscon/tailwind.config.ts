import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: { DEFAULT: 'var(--canvas-bg)', subtle: 'var(--canvas-subtle)' },
        surface: {
          card: 'var(--surface-card)',
          elevated: 'var(--surface-elevated)',
          hover: 'var(--surface-hover)',
          sunken: 'var(--surface-sunken)',
        },
        ink: {
          bright: 'var(--text-bright)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        line: {
          hairline: 'var(--border-hairline)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },
        brand: {
          DEFAULT: 'var(--brand-emerald)',
          hover: 'var(--brand-emerald-hover)',
          active: 'var(--brand-emerald-active)',
          subtle: 'var(--brand-emerald-subtle)',
          border: 'var(--brand-emerald-border)',
          text: 'var(--brand-emerald-text)',
        },
        signal: { emerald: 'var(--signal-emerald)' },
        warning: { amber: 'var(--warning-amber)' },
        danger: { crimson: 'var(--danger-crimson)' },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        ambient: 'var(--shadow-ambient)',
        floating: 'var(--shadow-floating)',
        modal: 'var(--shadow-modal)',
      },
    },
  },
  plugins: [],
};

export default config;