import { Link, NavLink, useLocation } from 'react-router-dom';
import type { ComponentType, SVGProps } from 'react';
import { Home, Leaf, Scan, Sprout, User } from '@/components/icons';
import { cn } from '@/components/ui';
import { useAuthStore } from '@/store/auth';

type Tab = {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  end?: boolean;
};

/** Four side tabs; the raised center action (Quét) sits between #2 and #3. */
const LEFT: Tab[] = [
  { to: '/', label: 'Trang chủ', icon: Home, end: true },
  { to: '/plants', label: 'Khu vườn', icon: Sprout },
];
const RIGHT: Tab[] = [
  { to: '/care', label: 'Chăm sóc', icon: Leaf },
  { to: '/profile', label: 'Tôi', icon: User },
];

/**
 * App-style bottom navigation for phones. Hidden on desktop (≥lg), where the
 * top SiteHeader takes over. The center button is a raised "quét nhanh" FAB that
 * jumps straight into the camera (see ScanScreen's `quick` handling).
 */
export function MobileTabBar() {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  // Auth-gated tabs point to login when logged out so taps never dead-end.
  const gate = (to: string) => (user ? to : `/login`);
  const scanTo = user ? '/scan?quick=1' : '/login';
  const scanActive = pathname.startsWith('/scan');

  return (
    <nav className="tabbar lg:hidden" aria-label="Điều hướng chính">
      <div className="mx-auto flex h-[var(--bottom-nav-height)] max-w-md items-stretch justify-around px-2">
        {LEFT.map((t) => (
          <TabLink key={t.to} tab={t} to={t.to} />
        ))}

        {/* Raised quick-scan action */}
        <div className="relative flex w-16 shrink-0 items-start justify-center">
          <Link
            to={scanTo}
            aria-label="Quét nhanh"
            className="absolute -top-5 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_10px_24px_rgba(22,163,74,0.45)] ring-4 ring-[var(--bg-base)] transition-transform active:scale-95"
            style={{ backgroundImage: 'var(--grad-brand)' }}
          >
            <Scan className={cn('h-7 w-7 transition-transform', scanActive && 'scale-110')} />
          </Link>
          <span className="absolute -bottom-0.5 text-[10px] font-semibold text-brand-700">Quét</span>
        </div>

        {RIGHT.map((t) => (
          <TabLink key={t.to} tab={t} to={gate(t.to)} />
        ))}
      </div>
    </nav>
  );
}

function TabLink({ tab, to }: { tab: Tab; to: string }) {
  const Icon = tab.icon;
  return (
    <NavLink
      to={to}
      end={tab.end}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors',
          isActive ? 'text-brand-600' : 'text-content-tertiary',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
              isActive && 'bg-brand-50',
            )}
          >
            <Icon className={cn('h-[22px] w-[22px]', isActive && 'text-brand-600')} />
          </span>
          <span className="leading-none">{tab.label}</span>
        </>
      )}
    </NavLink>
  );
}
