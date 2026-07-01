import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Check } from '@/components/icons';
import { LeafMark } from '@/components/illustrations';
import { Button, Input, Label } from '@/components/ui';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/features/auth/useAuth';

export function ResetPasswordScreen() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const reset = useMutation({
    mutationFn: () => api.auth.resetPassword(token, password),
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <LeafMark className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Đặt lại mật khẩu</h1>
      </div>

      <div className="card p-6">
        {!token ? (
          <p className="text-center text-sm text-danger">Liên kết không hợp lệ.</p>
        ) : reset.isSuccess ? (
          <div className="space-y-3 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <Check className="h-6 w-6" />
            </span>
            <h2 className="font-semibold">Đã đổi mật khẩu</h2>
            <Link to="/login" className="btn btn-primary w-full">
              Đăng nhập
            </Link>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              reset.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label>Mật khẩu mới</Label>
              <Input
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="Tối thiểu 8 ký tự"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {reset.isError && <p className="text-sm text-danger">{authErrorMessage(reset.error)}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={reset.isPending}>
              {reset.isPending ? 'Đang lưu…' : 'Đặt lại mật khẩu'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
