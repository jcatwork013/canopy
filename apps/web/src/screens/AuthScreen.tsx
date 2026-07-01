import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, Mail, ShieldCheck, User } from '@/components/icons';
import { LeafMark } from '@/components/illustrations';
import { Button, Input, Label } from '@/components/ui';
import { loginErrorMessage, useLogin } from '@/features/auth/useLogin';
import { authErrorMessage, useRegister } from '@/features/auth/useAuth';

const PANEL_BG =
  'linear-gradient(rgba(8,22,14,0.55), rgba(8,22,14,0.78)), url(https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000&q=80&auto=format&fit=crop)';

const BULLETS = ['Nhận diện cây tức thì', 'Chẩn đoán bệnh bằng AI', 'Nhắc lịch chăm sóc tự động'];

export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden flex-col justify-between p-12 text-white lg:flex"
        style={{ backgroundImage: PANEL_BG, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <LeafMark className="h-9 w-9" />
          <span className="text-lg font-extrabold tracking-tight">Canopy</span>
        </Link>
        <div className="anim-fade-up">
          <h2 className="text-3xl font-bold leading-tight">Chăm cây thông minh hơn mỗi ngày.</h2>
          <ul className="mt-6 space-y-3">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-white/90">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-4 w-4" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} Canopy · Chăm cây cùng AI</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="anim-fade-up w-full max-w-sm">
          <div className="mb-7 text-center lg:hidden">
            <LeafMark className="mx-auto h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </h1>
          <p className="mt-1 text-sm text-content-secondary">
            {mode === 'login'
              ? 'Tiếp tục chăm sóc khu vườn của bạn.'
              : 'Miễn phí — chỉ cần email để bắt đầu.'}
          </p>

          <div className="mt-6">{mode === 'login' ? <LoginForm /> : <RegisterForm />}</div>

          <p className="mt-6 text-center text-sm text-content-secondary">
            {mode === 'login' ? (
              <>
                Chưa có tài khoản?{' '}
                <Link to="/register" className="font-semibold text-brand-600 hover:underline">
                  Đăng ký
                </Link>
              </>
            ) : (
              <>
                Đã có tài khoản?{' '}
                <Link to="/login" className="font-semibold text-brand-600 hover:underline">
                  Đăng nhập
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const login = useLogin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate({ email, password }, { onSuccess: () => navigate('/') });
      }}
    >
      <Field label="Email" icon={<Mail className="h-5 w-5" />}>
        <Input
          type="email"
          autoComplete="username"
          placeholder="ban@email.com"
          className="h-12 pl-11"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      <Field
        label="Mật khẩu"
        trailing={
          <button type="button" onClick={() => setShow((v) => !v)} aria-label="Hiện/ẩn mật khẩu">
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        }
      >
        <Input
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-12 pr-11"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <div className="text-right">
        <Link to="/forgot-password" className="text-sm text-brand-600 hover:underline">
          Quên mật khẩu?
        </Link>
      </div>
      {login.isError && <p className="text-sm text-danger">{loginErrorMessage(login.error)}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
        {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        {!login.isPending && <ArrowRight className="h-5 w-5" />}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const register = useRegister();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  if (register.isSuccess) {
    return (
      <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50 p-5 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white">
          <Mail className="h-6 w-6" />
        </span>
        <h2 className="font-semibold text-content">Kiểm tra email của bạn</h2>
        <p className="text-sm text-content-secondary">
          Đã gửi liên kết xác minh tới <b>{email}</b>. Mở email và bấm xác minh để kích hoạt.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        register.mutate({ full_name: fullName, email, password });
      }}
    >
      <Field label="Họ và tên" icon={<User className="h-5 w-5" />}>
        <Input
          placeholder="Nguyễn Văn A"
          className="h-12 pl-11"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </Field>
      <Field label="Email" icon={<Mail className="h-5 w-5" />}>
        <Input
          type="email"
          autoComplete="username"
          placeholder="ban@email.com"
          className="h-12 pl-11"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      <Field
        label="Mật khẩu"
        trailing={
          <button type="button" onClick={() => setShow((v) => !v)} aria-label="Hiện/ẩn mật khẩu">
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        }
      >
        <Input
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Tối thiểu 8 ký tự"
          minLength={8}
          className="h-12 pr-11"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      {register.isError && <p className="text-sm text-danger">{authErrorMessage(register.error)}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={register.isPending}>
        {register.isPending ? 'Đang tạo…' : 'Tạo tài khoản'}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-content-tertiary">
        <ShieldCheck className="h-4 w-4 text-brand-600" />
        Cần xác minh email để kích hoạt
      </p>
    </form>
  );
}

function Field({
  label,
  icon,
  trailing,
  children,
}: {
  label: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-content-tertiary">
            {icon}
          </span>
        )}
        {children}
        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary">
            {trailing}
          </span>
        )}
      </div>
    </div>
  );
}
