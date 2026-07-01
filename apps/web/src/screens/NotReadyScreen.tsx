import { useState } from 'react';
import { Leaf, Settings } from '@/components/icons';
import { AdminLogin } from '@/features/auth/AdminLogin';

interface Props {
  reason: 'connection' | 'setup';
}

/**
 * Shown to non-admin (or logged-out) users when the system is not ready. We do
 * NOT reveal which secrets are missing. An admin can expand the login form to
 * sign in and reach the Setup Wizard.
 */
export function NotReadyScreen({ reason }: Props) {
  const isConnection = reason === 'connection';
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div
      className="app-frame flex flex-col items-center justify-center gap-6 px-6 py-12 text-center"
      style={{ background: 'var(--bg-base) var(--grad-hero) no-repeat' }}
    >
      {/* Brand badge */}
      <div className="relative">
        <span
          aria-hidden
          className="absolute inset-0 rounded-2xl blur-xl"
          style={{ background: 'var(--grad-brand)', opacity: 0.35 }}
        />
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-lg"
          style={{ background: 'var(--grad-brand)' }}
        >
          {isConnection ? <Settings className="h-9 w-9" /> : <Leaf className="h-9 w-9" />}
        </div>
      </div>

      {/* Status pill */}
      <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1 text-xs font-medium text-content-secondary shadow-sm">
        <span className="relative flex h-2 w-2">
          {!isConnection && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isConnection ? 'bg-warning' : 'bg-brand-500'
            }`}
          />
        </span>
        {isConnection ? 'Mất kết nối' : 'Đang cấu hình'}
      </span>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-content">
          {isConnection ? 'Không kết nối được máy chủ' : 'Hệ thống đang được thiết lập'}
        </h1>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-content-secondary">
          {isConnection
            ? 'Vui lòng kiểm tra kết nối mạng và thử lại sau giây lát.'
            : 'Canopy đang được quản trị viên cấu hình. Vui lòng quay lại sau ít phút.'}
        </p>
      </div>

      <button className="btn btn-ghost px-6" onClick={() => location.reload()}>
        Thử lại
      </button>

      {!isConnection && (
        <div className="w-full max-w-sm pt-2">
          {showLogin ? (
            <div className="card p-6 text-left shadow-lg">
              <AdminLogin />
            </div>
          ) : (
            <button
              className="text-sm font-medium text-content-tertiary underline-offset-4 transition-colors hover:text-content-secondary hover:underline"
              onClick={() => setShowLogin(true)}
            >
              Bạn là quản trị viên? Đăng nhập
            </button>
          )}
        </div>
      )}

      <p className="pt-2 text-xs text-content-tertiary">
        © {new Date().getFullYear()} Canopy · Chăm cây cùng AI
      </p>
    </div>
  );
}
