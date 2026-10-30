import { InputHTMLAttributes, forwardRef, useId, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className, id, trailing, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id || rest.name || generatedId;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-ink-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-10 px-3 rounded-lg border bg-surface-card text-ink-primary',
              'border-line-subtle focus:border-line-focus focus:outline-none focus:ring-2 focus:ring-brand-subtle',
              trailing && 'pr-10',
              error && 'border-danger-crimson',
              className
            )}
            aria-invalid={!!error}
            {...rest}
          />
          {trailing && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
              {trailing}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-danger-crimson">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';