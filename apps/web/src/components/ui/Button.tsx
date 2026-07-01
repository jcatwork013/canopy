import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  default: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
  secondary: 'bg-subtle text-content hover:bg-border-subtle',
  outline: 'border border-border-strong bg-surface text-content hover:bg-subtle',
  ghost: 'text-content-secondary hover:bg-subtle hover:text-content',
  destructive: 'bg-danger text-white shadow-sm hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  default: 'h-10 px-4 text-sm',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-9 w-9',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** shadcn-style button mapped onto Canopy design tokens. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background,color,box-shadow,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
