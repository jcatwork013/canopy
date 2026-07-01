import { cn } from './cn';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

/** Minimal accessible toggle (no Radix dependency). */
export function Switch({ checked, onCheckedChange, disabled, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand-600' : 'bg-border-strong',
      )}
      {...rest}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
