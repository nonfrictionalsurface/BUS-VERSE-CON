import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface Props extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = forwardRef<HTMLDivElement, Props>(
  ({ elevated, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-line-hairline bg-surface-card p-5',
        elevated && 'shadow-floating',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';