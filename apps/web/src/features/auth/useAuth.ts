import { ApiError } from '@canopy/shared';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

/** Register a new account. Backend creates it pending + sends a verification
 *  email; the returned tokens log the user in (with a "verify email" banner). */
export function useRegister() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (vars: { email: string; password: string; full_name: string; phone?: string }) =>
      api.auth.register(vars),
    onSuccess: (res) => setUser(res.user),
  });
}

export function useVerifyEmail() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async (token: string) => {
      await api.auth.verifyEmail(token);
      // Refresh the session user so the verified state reflects immediately.
      try {
        setUser(await api.auth.me());
      } catch {
        /* not logged in on this device — that's fine */
      }
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api.auth.forgotPassword(email),
  });
}

export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Có lỗi xảy ra, vui lòng thử lại.';
}
