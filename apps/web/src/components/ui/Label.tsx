import type { LabelHTMLAttributes } from 'react';
import { cn } from './cn';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-sm font-medium leading-none text-content', className)}
      {...props}
    />
  );
}
