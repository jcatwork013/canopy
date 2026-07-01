import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { roleHelpers, type User } from '@canopy/shared';
import { Camera, Check, LogOut, MapPin, Pencil, Scan, Settings, ShieldCheck, Sparkles, X } from '@/components/icons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button, Card, CardContent, CardHeader, CardTitle, cn, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { fileToResizedBase64 } from '@/lib/image';
import { useAuthStore } from '@/store/auth';
import { useProfileStore } from '@/store/profile';
import { getHistory } from '@/features/scan/history';

const STATUS_VI: Record<string, string> = {
  active: 'Đang hoạt động',
  pending: 'Chờ kích hoạt',
  suspended: 'Tạm khoá',
  banned: 'Bị cấm',
};
const KYC_VI: Record<string, string> = {
  none: 'Chưa xác thực',
  submitted: 'Đã gửi',
  in_review: 'Đang duyệt',
  verified: 'Đã xác thực',
  rejected: 'Bị từ chối',
};
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const history = user ? getHistory(user.id) : [];

  const prefs = useProfileStore((s) => s.prefs);
  const loadFor = useProfileStore((s) => s.loadFor);
  const updatePrefs = useProfileStore((s) => s.update);
  useEffect(() => {
    if (user) loadFor(user.id);
  }, [user, loadFor]);

  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const displayName = prefs.name || user?.full_name || 'Khách';
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const saveName = () => {
    const n = nameDraft.trim();
    if (n && user) updatePrefs(user.id, { name: n });
    setEditingName(false);
  };

  const upload = async (file: File | undefined, which: 'avatar' | 'banner') => {
    if (!file || !user) return;
    const { dataUrl } = await fileToResizedBase64(file, which === 'avatar' ? 320 : 1400, 0.82);
    updatePrefs(user.id, { [which]: dataUrl });
  };

  const logout = async () => {
    await api.auth.logout().catch(() => undefined);
    clear();
    window.location.href = '/';
  };

  const roleBadges = [
    user?.is_player && 'Người chơi cây',
    user?.is_seller && 'Người bán',
    user?.is_caretaker && 'Chăm sóc',
    user?.is_system_admin && 'Quản trị',
  ].filter(Boolean) as string[];

  const initials = (displayName || user?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const verified = roleHelpers.emailVerified(user);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* hidden uploaders */}
      <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], 'avatar')} />
      <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], 'banner')} />

      {/* ===== Cover + identity (Facebook style) ===== */}
      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm">
        <div className="relative h-44 sm:h-60" style={!prefs.banner ? { backgroundImage: 'var(--grad-brand)' } : undefined}>
          {prefs.banner && <img src={prefs.banner} alt="" className="h-full w-full object-cover" />}
          {user && (
            <button
              onClick={() => bannerRef.current?.click()}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/45 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/60"
            >
              <Camera className="h-4 w-4" />
              Ảnh bìa
            </button>
          )}
        </div>

        <div className="px-4 pb-4 sm:px-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:gap-5">
            {/* avatar */}
            <div className="relative -mt-16 sm:-mt-14">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-brand-600 text-3xl font-bold text-white shadow-md">
                {prefs.avatar ? (
                  <img src={prefs.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              {user && (
                <button
                  onClick={() => avatarRef.current?.click()}
                  aria-label="Đổi avatar"
                  className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-content text-white shadow hover:opacity-90"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* name + meta */}
            <div className="flex-1 text-center sm:pb-1 sm:text-left">
              {editingName ? (
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                    className="h-9 max-w-[220px]"
                    placeholder="Tên hiển thị"
                  />
                  <Button size="sm" onClick={saveName}>
                    Lưu
                  </Button>
                  <button onClick={() => setEditingName(false)} className="text-content-tertiary hover:text-content">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                  {user && (
                    <button
                      onClick={() => {
                        setNameDraft(displayName);
                        setEditingName(true);
                      }}
                      aria-label="Đổi tên"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-content-tertiary hover:bg-subtle hover:text-content"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
              <p className="text-sm text-content-tertiary">{user?.email ?? 'Chưa đăng nhập'}</p>
              {roleBadges.length > 0 && (
                <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                  {roleBadges.map((r) => (
                    <span key={r} className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* actions */}
            <div className="flex gap-2 sm:pb-1">
              {user?.is_system_admin && (
                <Link to="/admin" className="btn btn-ghost h-10 px-4 text-sm">
                  <Settings className="h-4 w-4" />
                  Quản trị
                </Link>
              )}
              {user ? (
                <Button variant="outline" size="default" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </Button>
              ) : (
                <Link to="/login" className="btn btn-primary px-4">
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Two columns ===== */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Intro */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Giới thiệu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <IntroRow icon={<Check className="h-4 w-4" />} ok={verified}>
                Email <b className="font-semibold">{verified ? 'đã xác minh' : 'chưa xác minh'}</b>
              </IntroRow>
              <IntroRow icon={<MapPin className="h-4 w-4" />}>
                Trạng thái:{' '}
                <b className="font-semibold">
                  {STATUS_VI[user?.account_status ?? ''] ?? user?.account_status ?? '—'}
                </b>
              </IntroRow>
              <IntroRow icon={<Sparkles className="h-4 w-4" />}>
                Ngày tham gia <b className="font-semibold">{fmtDate(user?.created_at)}</b>
              </IntroRow>
              {verified && (
                <IntroRow icon={<Check className="h-4 w-4" />} ok>
                  Kích hoạt ngày <b className="font-semibold">{fmtDate(user?.email_verified_at)}</b>
                </IntroRow>
              )}
              <IntroRow icon={<Check className="h-4 w-4" />} ok={user?.kyc_status === 'verified'}>
                KYC: <b className="font-semibold">{KYC_VI[user?.kyc_status ?? 'none'] ?? user?.kyc_status}</b>
              </IntroRow>
              <IntroRow icon={<Scan className="h-4 w-4" />}>
                Đã quét <b className="font-semibold">{history.length}</b> cây
              </IntroRow>
            </CardContent>
          </Card>

          {user && <RoleCtaCard user={user} />}

          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-sm font-medium">Giao diện</span>
              <ThemeToggle />
            </CardContent>
          </Card>
        </div>

        {/* Activity feed (scan history) */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Hoạt động gần đây</CardTitle>
            <Link to="/scan" className="text-sm font-medium text-brand-600 hover:underline">
              Quét mới
            </Link>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-subtle text-content-tertiary">
                  <Scan className="h-7 w-7" />
                </span>
                <p className="text-sm text-content-tertiary">Chưa có hoạt động nào.</p>
                <Link to="/scan" className="btn btn-primary mt-1 px-5">
                  Quét cây đầu tiên
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <Link
                    key={h.id}
                    to={`/scan?mode=${h.mode}&history=${h.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border-subtle p-3 transition-colors hover:border-brand-400 hover:bg-subtle"
                  >
                    <img src={h.thumb} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{h.title}</p>
                      <p className="text-xs text-content-tertiary">
                        {h.mode === 'diagnose' ? '🩺 Chẩn đoán bệnh' : '🌿 Nhận diện cây'} ·{' '}
                        {new Date(h.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-brand-600">Xem lại</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RoleCtaCard({ user }: { user: User }) {
  const verified = user.kyc_status === 'verified' && (user.is_seller || user.is_caretaker);
  const roles = [user.is_seller && 'Người bán', user.is_caretaker && 'Chăm sóc'].filter(Boolean) as string[];

  const state = verified
    ? { tone: 'ok' as const, title: 'Tài khoản đã xác thực', sub: roles.join(' · '), cta: 'Quản lý' }
    : user.kyc_status === 'submitted' || user.kyc_status === 'in_review'
      ? { tone: 'warn' as const, title: 'Hồ sơ đang chờ duyệt', sub: 'Quản trị viên đang xem xét', cta: 'Xem' }
      : user.kyc_status === 'rejected'
        ? { tone: 'danger' as const, title: 'Hồ sơ bị từ chối', sub: 'Kiểm tra và gửi lại', cta: 'Gửi lại' }
        : {
            tone: 'cta' as const,
            title: 'Trở thành người bán / chăm sóc',
            sub: 'Xác thực danh tính để mở khoá bán cây và nhận chăm sóc',
            cta: 'Đăng ký',
          };

  const tone = {
    ok: 'bg-brand-100 text-brand-700',
    warn: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    cta: 'bg-brand-100 text-brand-700',
  }[state.tone];

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tone)}>
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{state.title}</p>
          <p className="truncate text-xs text-content-tertiary">{state.sub}</p>
        </div>
        <Link to="/kyc" className="btn btn-primary h-9 shrink-0 px-3 text-sm">
          {state.cta}
        </Link>
      </CardContent>
    </Card>
  );
}

function IntroRow({ icon, ok, children }: { icon: React.ReactNode; ok?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          ok === undefined ? 'bg-subtle text-content-tertiary' : ok ? 'bg-brand-100 text-brand-600' : 'bg-amber-100 text-amber-600',
        )}
      >
        {ok === false ? <X className="h-4 w-4" /> : icon}
      </span>
      <span className="text-content-secondary">{children}</span>
    </div>
  );
}
