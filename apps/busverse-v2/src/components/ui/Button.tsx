'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover active:bg-brand-active',
  secondary: 'bg-surface text-text-primary border border-border-subtle hover:bg-surface-hover',
  ghost: 'text-text-primary hover:bg-surface-hover',
  danger: 'bg-danger text-white hover:opacity-90',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading = false, fullWidth = false, disabled, children, className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
});