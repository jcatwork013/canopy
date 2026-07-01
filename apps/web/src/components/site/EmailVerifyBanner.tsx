import { roleHelpers } from '@canopy/shared';
import { Mail } from '@/components/icons';
import { useAuthStore } from '@/store/auth';

/** Persistent nudge for logged-in users who haven't verified their email. */
export function EmailVerifyBanner() {
  const user = useAuthStore((s) => s.user);
  if (!user || roleHelpers.emailVerified(user)) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-800">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm sm:px-6 lg:px-8">
        <Mail className="h-4 w-4 shrink-0" />
        <span>
          Vui lòng <b>xác minh email</b> của bạn để kích hoạt đầy đủ tài khoản. Kiểm tra hộp thư{' '}
          <b>{user.email}</b>.
        </span>
      </div>
    </div>
  );
}
