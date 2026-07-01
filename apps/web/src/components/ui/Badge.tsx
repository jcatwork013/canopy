import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type BadgeVariant = 'brand' | 'muted' | 'success' | 'warning' | 'danger' | 'outline';

const VARIANTS: Record<BadgeVariant, string> = {
  brand: 'bg-brand-100 text-brand-700',
  success: 'bg-brand-100 text-brand-700',
  muted: 'bg-subtle text-content-tertiary',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  outline: 'border border-border-strong text-content-secondary',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'muted', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
