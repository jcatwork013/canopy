import { useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { SiteShell } from '@/components/site/SiteShell';
import { ContentLayout } from '@/components/site/ContentLayout';
import { SystemGate } from '@/features/system/SystemGate';
import { AdminConsole } from '@/features/admin/AdminConsole';
import { SplashScreen } from '@/components/SplashScreen';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { LandingScreen } from '@/screens/LandingScreen';
import { AuthScreen } from '@/screens/AuthScreen';
import { VerifyEmailScreen } from '@/screens/VerifyEmailScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/screens/ResetPasswordScreen';
import { PlantsScreen } from '@/screens/PlantsScreen';
import { ScanScreen } from '@/screens/ScanScreen';
import { CareScreen } from '@/screens/CareScreen';
import { KycScreen } from '@/screens/KycScreen';
import { CommunityScreen } from '@/screens/CommunityScreen';
import { ListingDetailScreen } from '@/screens/ListingDetailScreen';
import { ServiceDetailScreen } from '@/screens/ServiceDetailScreen';
import { GuidesScreen } from '@/screens/GuidesScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';

/** Requires a logged-in user; otherwise redirects to login. */
function RequireAuth() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  if (!hydrated) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Guest-only (login/register): already-authenticated users skip to the app. */
function GuestOnly() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  if (!hydrated) return <SplashScreen />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Full-screen admin console, gated to system admins. */
function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  if (!hydrated) return <SplashScreen />;
  if (!user?.is_system_admin) return <Navigate to="/" replace />;
  return <AdminConsole />;
}

const router = createBrowserRouter([
  { path: '/admin', element: <AdminRoute /> },

  // Full-screen auth (no site header/footer). Logged-in users are redirected home.
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <AuthScreen mode="login" /> },
      { path: '/register', element: <AuthScreen mode="register" /> },
    ],
  },
  { path: '/verify-email', element: <VerifyEmailScreen /> },
  { path: '/forgot-password', element: <ForgotPasswordScreen /> },
  { path: '/reset-password', element: <ResetPasswordScreen /> },

  // Public website (header + footer).
  {
    element: <SiteShell />,
    children: [
      { path: '/', element: <LandingScreen /> },
      {
        element: <ContentLayout />,
        children: [
          { path: '/community', element: <CommunityScreen /> },
          { path: '/community/service/:id', element: <ServiceDetailScreen /> },
          { path: '/community/:id', element: <ListingDetailScreen /> },
          { path: '/guides', element: <GuidesScreen /> },
          {
            element: <RequireAuth />,
            children: [
              { path: '/scan', element: <ScanScreen /> },
              { path: '/plants', element: <PlantsScreen /> },
              { path: '/care', element: <CareScreen /> },
              { path: '/kyc', element: <KycScreen /> },
              { path: '/profile', element: <ProfileScreen /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  // Hydrate the session on boot: if we hold tokens, fetch the current user.
  useEffect(() => {
    (async () => {
      const tokens = await api.tokens.get();
      if (tokens?.access_token) {
        try {
          setUser(await api.auth.me());
        } catch {
          /* tokens invalid; stay logged out */
        }
      }
      setHydrated(true);
    })();
  }, [setUser, setHydrated]);

  return (
    <SystemGate>
      <RouterProvider router={router} />
    </SystemGate>
  );
}
