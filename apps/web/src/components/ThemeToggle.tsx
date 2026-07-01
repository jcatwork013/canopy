import { Monitor, Moon, Sun } from '@/components/icons';
import { cn } from '@/components/ui';
import { useThemeStore, type Theme } from '@/store/theme';

const ORDER: Theme[] = ['system', 'light', 'dark'];
const META: Record<Theme, { label: string; Icon: typeof Sun }> = {
  system: { label: 'Theo hệ thống', Icon: Monitor },
  light: { label: 'Sáng', Icon: Sun },
  dark: { label: 'Tối', Icon: Moon },
};

/** Single elegant button that cycles system → sáng → tối. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const { label, Icon } = META[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]!;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Giao diện: ${label}`}
      aria-label={`Đổi giao diện (đang: ${label})`}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-content-secondary transition-colors hover:bg-subtle hover:text-content',
        className,
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
