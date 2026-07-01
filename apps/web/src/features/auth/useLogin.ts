import { ApiError } from '@canopy/shared';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

/** Logs in, persists tokens (handled by the client), and sets the user. */
export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (vars: { email: string; password: string }) => api.auth.login(vars),
    onSuccess: (res) => setUser(res.user),
  });
}

export function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Đăng nhập thất bại, thử lại sau.';
}
