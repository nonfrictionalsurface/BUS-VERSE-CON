'use client';

import { InputHTMLAttributes, forwardRef, useId } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = '', ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-text-primary">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`w-full h-11 px-4 rounded-lg bg-surface text-text-primary border transition-colors focus:outline-none focus:ring-2 focus:ring-brand/30 ${error ? 'border-danger-crimson' : 'border-border-subtle focus:border-border-focus'} ${className}`}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger-crimson">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
});