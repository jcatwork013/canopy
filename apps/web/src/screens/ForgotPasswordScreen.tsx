import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from '@/components/icons';
import { LeafMark } from '@/components/illustrations';
import { Button, Input, Label } from '@/components/ui';
import { useForgotPassword } from '@/features/auth/useAuth';

export function ForgotPasswordScreen() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState('');

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <LeafMark className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Quên mật khẩu</h1>
        <p className="mt-1 text-sm text-content-secondary">
          Nhập email, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
        </p>
      </div>

      <div className="card p-6">
        {forgot.isSuccess ? (
          <div className="space-y-2 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Mail className="h-6 w-6" />
            </span>
            <h2 className="font-semibold">Đã gửi email</h2>
            <p className="text-sm text-content-secondary">
              Nếu <b>{email}</b> tồn tại, bạn sẽ nhận được liên kết đặt lại mật khẩu.
            </p>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              forgot.mutate(email);
            }}
          >
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="ban@email.com"
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={forgot.isPending}>
              {forgot.isPending ? 'Đang gửi…' : 'Gửi liên kết'}
            </Button>
          </form>
        )}
      </div>

      <p className="mt-5 text-center text-sm">
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          ← Về đăng nhập
        </Link>
      </p>
    </div>
  );
}
