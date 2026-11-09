import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas-bg)',
        'canvas-subtle': 'var(--canvas-subtle)',
        surface: 'var(--surface-card)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-hover': 'var(--surface-hover)',
        'surface-sunken': 'var(--surface-sunken)',
        'text-bright': 'var(--text-bright)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-hairline': 'var(--border-hairline)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'border-focus': 'var(--border-focus)',
        brand: 'var(--brand-primary)',
        'brand-hover': 'var(--brand-primary-hover)',
        'brand-active': 'var(--brand-primary-active)',
        'brand-subtle': 'var(--brand-primary-subtle)',
        'brand-border': 'var(--brand-primary-border)',
        'telemetry-cyan': 'var(--telemetry-cyan)',
        'signal-emerald': 'var(--signal-emerald)',
        'warning-amber': 'var(--warning-amber)',
        'danger-crimson': 'var(--danger-crimson)',
        danger: 'var(--danger-crimson)',
        warning: 'var(--warning-amber)',
        success: 'var(--signal-emerald)',
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