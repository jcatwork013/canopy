import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './cn';

/** Compact form input (desktop admin density). Colours are explicit so typed
 *  text always contrasts the field, in light or dark, autofilled or not. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        // 16px on mobile so iOS never zoom-jumps on focus; compact 14px on desktop.
        'h-10 w-full rounded-md border border-border-subtle bg-input px-3 text-base text-content md:text-sm',
        'placeholder:text-content-tertiary transition-colors',
        'focus-visible:border-brand-500 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
