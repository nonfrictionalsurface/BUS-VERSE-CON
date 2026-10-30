import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type Tone = 'emerald' | 'amber' | 'red' | 'slate' | 'brand';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  emerald: 'bg-signal-emerald/10 text-signal-emerald',
  amber: 'bg-warning-amber/10 text-warning-amber',
  red: 'bg-danger-crimson/10 text-danger-crimson',
  slate: 'bg-ink-muted/10 text-ink-secondary',
  brand: 'bg-brand-subtle text-brand-text',
};

export function Badge({ tone = 'slate', className, children, ...rest }: Props) {
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', tones[tone], className)}
      {...rest}
    >
      {children}
    </span>
  );
}