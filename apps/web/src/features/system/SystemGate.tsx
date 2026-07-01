import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth';
import { useSystemStatus } from './useSystemStatus';
import { SplashScreen } from '@/components/SplashScreen';
import { NotReadyScreen } from '@/screens/NotReadyScreen';
import { AdminConsole } from '@/features/admin/AdminConsole';

/**
 * The activation gate. Canopy is an informational website, so the public site
 * is ALWAYS visible; only the connection error (server unreachable) blocks it.
 *   - loading             -> splash
 *   - error/unreachable   -> "không kết nối được"
 *   - not ready + admin    -> first-run Setup Wizard (admin console)
 *   - otherwise            -> render the website (app features degrade until ready)
 */
export function SystemGate({ children }: { children: ReactNode }) {
  const { data, isLoading, isError } = useSystemStatus();
  const user = useAuthStore((s) => s.user);

  if (isLoading) return <SplashScreen />;

  if (isError || !data) {
    return <NotReadyScreen reason="connection" />;
  }

  // First-run: let an admin reach the setup wizard straight away.
  if (!data.ready && user?.is_system_admin) {
    return <AdminConsole firstRun />;
  }

  return <>{children}</>;
}
