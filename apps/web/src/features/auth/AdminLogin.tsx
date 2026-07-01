import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Spinner } from '@/components/icons';
import { loginErrorMessage, useLogin } from './useLogin';

/** Compact email/password form used by the setup gate so an admin can sign in. */
export function AdminLogin() {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      className="w-full space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate({ email, password });
      }}
    >
      <div className="flex items-center gap-2 text-content-secondary">
        <ShieldCheck className="h-5 w-5 text-brand-600" />
        <span className="text-sm font-semibold text-content">Đăng nhập quản trị</span>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="admin-email" className="block text-xs font-medium text-content-secondary">
          Email quản trị
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-content-tertiary" />
          <input
            id="admin-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="admin@canopy.app"
            className="input input-icon"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="admin-password" className="block text-xs font-medium text-content-secondary">
          Mật khẩu
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-content-tertiary" />
          <input
            id="admin-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className="input input-icon input-trailing"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-content-tertiary transition-colors hover:text-content-secondary"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {login.isError && (
        <p className="text-sm font-medium text-danger">{loginErrorMessage(login.error)}</p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={login.isPending}>
        {login.isPending ? (
          <>
            <Spinner className="h-5 w-5 animate-spin" />
            Đang đăng nhập…
          </>
        ) : (
          <>
            Đăng nhập
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </form>
  );
}
