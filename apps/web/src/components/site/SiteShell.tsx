import { Outlet } from 'react-router-dom';
import { FloatingActions } from '@/components/FloatingActions';
import { EmailVerifyBanner } from './EmailVerifyBanner';
import { MobileTabBar } from './MobileTabBar';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/**
 * App frame. On phones it reads like a native app: sticky top bar + content +
 * a bottom tab bar with a raised quick-scan action. On desktop the tab bar is
 * hidden and the top nav + floating actions take over. The admin console lives
 * separately at /admin.
 */
export function SiteShell() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-base text-content pb-tabbar lg:pb-0">
      <SiteHeader />
      <EmailVerifyBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      {/* Desktop-only floating helpers — the bottom tab bar replaces them on mobile. */}
      <div className="hidden lg:block">
        <FloatingActions />
      </div>
      <MobileTabBar />
    </div>
  );
}
