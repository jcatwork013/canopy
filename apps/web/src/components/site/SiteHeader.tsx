import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Settings, User } from '@/components/icons';
import { LeafMark } from '@/components/illustrations';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NAV_ITEMS } from '@/components/navItems';
import { Button, cn } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useProfileStore } from '@/store/profile';

/** Top bar. Desktop: logo + full nav + account. Mobile: a clean, app-style bar
 *  (logo · theme · avatar) — the bottom tab bar carries navigation, so there is
 *  no hamburger. Secondary pages live on the Profile screen ("Khám phá thêm"). */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();

  const loadFor = useProfileStore((s) => s.loadFor);
  const avatar = useProfileStore((s) => s.prefs.avatar);
  const pname = useProfileStore((s) => s.prefs.name);
  useEffect(() => {
    if (user) loadFor(user.id);
  }, [user, loadFor]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const logout = async () => {
    await api.auth.logout().catch(() => undefined);
    clear();
    navigate('/');
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
      isActive
        ? scrolled
          ? 'bg-white/15 text-white'
          : 'bg-brand-50 text-brand-700'
        : scrolled
          ? 'text-white/85 hover:bg-white/10 hover:text-white'
          : 'text-content-secondary hover:bg-subtle hover:text-content',
    );

  return (
    <header
      className={cn(
        // pt clears the iOS notch/status bar (viewport-fit=cover) so the logo
        // is never jammed under the system UI on a real phone.
        'sticky top-0 z-[var(--z-header)] border-b pt-[var(--safe-top)] backdrop-blur-md transition-colors',
        scrolled
          ? 'border-transparent bg-[#0c1510]/95 text-white shadow-lg'
          : 'border-border-subtle bg-surface/95 shadow-sm',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <LeafMark className="h-9 w-9" />
          <span className={cn('text-lg font-extrabold tracking-tight', scrolled && 'text-white')}>
            Canopy
          </span>
        </Link>

        {/* Desktop: full nav + account, pushed right */}
        <div className="ml-auto hidden items-center gap-1 lg:flex">
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.filter((n) => n.to !== '/profile').map((n) => {
              const Icon = n.icon;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    n.primary
                      ? cn(
                          'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition-colors',
                          isActive ? 'bg-brand-700 text-white' : 'bg-brand-600 text-white hover:bg-brand-700',
                        )
                      : linkCls({ isActive })
                  }
                >
                  {n.primary && <Icon className="h-4 w-4" />}
                  {n.label}
                </NavLink>
              );
            })}
          </nav>
          <span className={cn('mx-2 h-6 w-px', scrolled ? 'bg-white/20' : 'bg-border-subtle')} />
          {user ? (
            <UserMenu user={user} onLogout={logout} scrolled={scrolled} avatar={avatar} name={pname} />
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className={scrolled ? 'bg-transparent text-white hover:bg-white/10' : undefined}
              >
                Đăng nhập
              </Button>
              <Button onClick={() => navigate('/register')}>Đăng ký</Button>
            </>
          )}
        </div>

        {/* Mobile: clean app bar — theme + avatar (nav lives in the bottom bar) */}
        <div className="ml-auto flex items-center gap-1.5 lg:hidden">
          <ThemeToggle
            className={cn(scrolled && 'text-white hover:bg-white/10')}
          />
          {user ? (
            <Link
              to="/profile"
              aria-label="Hồ sơ của tôi"
              className={cn(
                'flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border',
                scrolled ? 'border-white/30' : 'border-border-subtle',
              )}
            >
              {avatar ? (
                <img src={avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-brand-600 text-white">
                  <User className="h-4 w-4" />
                </span>
              )}
            </Link>
          ) : (
            <Button
              size="sm"
              onClick={() => navigate('/login')}
              className={scrolled ? 'bg-white text-brand-700 hover:bg-white/90' : undefined}
            >
              Đăng nhập
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function UserMenu({
  user,
  onLogout,
  scrolled,
  avatar,
  name,
}: {
  user: { full_name?: string; email: string; is_system_admin?: boolean };
  onLogout: () => void;
  scrolled?: boolean;
  avatar?: string;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-9 items-center gap-2 rounded-full border pl-1 pr-3',
          scrolled ? 'border-white/25 text-white hover:bg-white/10' : 'border-border-subtle hover:bg-subtle',
        )}
      >
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-brand-700">
          {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
        </span>
        <span className="max-w-[120px] truncate text-sm font-medium">
          {name || user.full_name || user.email}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-lg border border-border-subtle bg-surface text-content shadow-lg">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-subtle"
            >
              <User className="h-4 w-4 text-content-tertiary" /> Hồ sơ
            </Link>
            {user.is_system_admin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-subtle"
              >
                <Settings className="h-4 w-4 text-content-tertiary" /> Quản trị
              </Link>
            )}
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2 border-t border-border-subtle px-4 py-2.5 text-left text-sm text-danger hover:bg-subtle"
            >
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </>
      )}
    </div>
  );
}
