import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, X } from '@/components/icons';
import { LeafMark } from '@/components/illustrations';
import { Button } from '@/components/ui';
import { useVerifyEmail } from '@/features/auth/useAuth';

export function VerifyEmailScreen() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const verify = useVerifyEmail();
  const fired = useRef(false);

  useEffect(() => {
    if (token && !fired.current) {
      fired.current = true;
      verify.mutate(token);
    }
  }, [token, verify]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10 text-center">
      <LeafMark className="h-12 w-12" />
      {!token ? (
        <State icon="x" title="Thiếu mã xác minh" desc="Liên kết không hợp lệ. Vui lòng mở lại từ email." />
      ) : verify.isPending ? (
        <State title="Đang xác minh…" desc="Vui lòng đợi trong giây lát." />
      ) : verify.isSuccess ? (
        <>
          <State icon="check" title="Xác minh thành công!" desc="Tài khoản của bạn đã được kích hoạt." />
          <Link to="/" className="btn btn-primary mt-5 px-6">
            Vào ứng dụng
          </Link>
        </>
      ) : (
        <>
          <State icon="x" title="Xác minh thất bại" desc="Liên kết đã hết hạn hoặc không hợp lệ." />
          <Button variant="outline" className="mt-5" onClick={() => verify.mutate(token)}>
            Thử lại
          </Button>
        </>
      )}
    </div>
  );
}

function State({ icon, title, desc }: { icon?: 'check' | 'x'; title: string; desc: string }) {
  return (
    <div className="mt-5 space-y-2">
      {icon && (
        <span
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            icon === 'check' ? 'bg-brand-100 text-brand-700' : 'bg-subtle text-danger'
          }`}
        >
          {icon === 'check' ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
        </span>
      )}
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-content-secondary">{desc}</p>
    </div>
  );
}
