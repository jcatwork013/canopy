import { Outlet } from 'react-router-dom';
import { FloatingActions } from '@/components/FloatingActions';
import { EmailVerifyBanner } from './EmailVerifyBanner';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/**
 * Public website frame: sticky top nav + content + footer. An informational
 * site (not an app dashboard); the admin console lives separately at /admin.
 */
export function SiteShell() {
  return (
    <div className="flex min-h-screen flex-col bg-base text-content">
      <SiteHeader />
      <EmailVerifyBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <FloatingActions />
    </div>
  );
}
