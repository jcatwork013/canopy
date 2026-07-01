import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { KycDocumentType, KycStatusInfo } from '@canopy/shared';
import { ApiError } from '@canopy/shared';
import { AlertTriangle, Camera, Check, ImagePlus, ShieldCheck, Spinner, Sprout, Store, X } from '@/components/icons';
import { Button, Card, CardContent, Input, Label, Switch, cn } from '@/components/ui';
import { api } from '@/lib/api';
import { fileToResizedBase64 } from '@/lib/image';
import { useAuthStore } from '@/store/auth';

const DOC_TYPES: { value: KycDocumentType; label: string }[] = [
  { value: 'national_id', label: 'Căn cước công dân' },
  { value: 'passport', label: 'Hộ chiếu' },
  { value: 'driver_license', label: 'Giấy phép lái xe' },
];

type Pic = { base64: string; mime: string; dataUrl: string };

export function KycScreen() {
  const [info, setInfo] = useState<KycStatusInfo | null>(null);
  const [loadErr, setLoadErr] = useState('');

  const load = () =>
    api.kyc
      .me()
      .then(setInfo)
      .catch((e) => setLoadErr(e instanceof ApiError ? e.message : 'Không tải được trạng thái.'));

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Xác thực & đăng ký vai trò</h1>
        <p className="text-sm text-content-secondary">
          Xác minh danh tính để trở thành <b>người bán cây</b> hoặc <b>người chăm sóc cây</b>. Hồ sơ sẽ được
          quản trị viên duyệt.
        </p>
      </header>

      {loadErr && <Banner tone="danger">{loadErr}</Banner>}

      {info === null && !loadErr ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-content-tertiary">
          <Spinner className="h-5 w-5 animate-spin" /> Đang tải…
        </div>
      ) : info ? (
        info.status === 'verified' ? (
          <VerifiedCard />
        ) : info.status === 'submitted' || info.status === 'in_review' ? (
          <PendingCard info={info} />
        ) : (
          <KycForm rejected={info.status === 'rejected'} reason={info.rejection_reason} onSubmitted={load} />
        )
      ) : null}

      <p className="rounded-md bg-subtle px-3 py-2 text-[11px] leading-snug text-content-tertiary">
        Giấy tờ của bạn được lưu trữ riêng tư và chỉ dùng cho mục đích xác minh danh tính.
      </p>
    </div>
  );
}

function VerifiedCard() {
  const user = useAuthStore((s) => s.user);
  const roles = [user?.is_seller && 'Người bán', user?.is_caretaker && 'Người chăm sóc'].filter(Boolean) as string[];
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <div>
          <p className="text-lg font-semibold">Đã xác thực 🎉</p>
          <p className="mt-1 text-sm text-content-secondary">
            Danh tính của bạn đã được duyệt. Bạn có thể đăng bán và nhận dịch vụ chăm sóc.
          </p>
        </div>
        {roles.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {roles.map((r) => (
              <span key={r} className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                {r}
              </span>
            ))}
          </div>
        )}
        <Link to="/community" className="btn btn-primary mt-1 px-5">
          Tới chợ cây
        </Link>
      </CardContent>
    </Card>
  );
}

function PendingCard({ info }: { info: KycStatusInfo }) {
  const roles = [info.requested_seller && 'Người bán', info.requested_caretaker && 'Người chăm sóc'].filter(
    Boolean,
  ) as string[];
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Spinner className="h-7 w-7 animate-spin" />
        </span>
        <div>
          <p className="text-lg font-semibold">Hồ sơ đang chờ duyệt</p>
          <p className="mt-1 text-sm text-content-secondary">
            Quản trị viên sẽ xem xét hồ sơ của bạn sớm. Bạn sẽ nhận được vai trò khi được duyệt.
          </p>
        </div>
        {roles.length > 0 && (
          <p className="text-sm text-content-tertiary">
            Vai trò đăng ký: <b className="text-content">{roles.join(', ')}</b>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function KycForm({
  rejected,
  reason,
  onSubmitted,
}: {
  rejected: boolean;
  reason?: string | null;
  onSubmitted: () => void;
}) {
  const setUser = useAuthStore((s) => s.setUser);
  const [seller, setSeller] = useState(true);
  const [caretaker, setCaretaker] = useState(false);
  const [docType, setDocType] = useState<KycDocumentType>('national_id');
  const [docNumber, setDocNumber] = useState('');
  const [front, setFront] = useState<Pic | null>(null);
  const [back, setBack] = useState<Pic | null>(null);
  const [selfie, setSelfie] = useState<Pic | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!seller && !caretaker) return setError('Chọn ít nhất một vai trò.');
    if (!front) return setError('Cần ảnh mặt trước giấy tờ.');
    setSubmitting(true);
    try {
      await api.kyc.submit({
        document_type: docType,
        document_number: docNumber.trim() || undefined,
        request_seller: seller,
        request_caretaker: caretaker,
        front_base64: front.base64,
        front_mime: front.mime,
        ...(back ? { back_base64: back.base64, back_mime: back.mime } : {}),
        ...(selfie ? { selfie_base64: selfie.base64, selfie_mime: selfie.mime } : {}),
      });
      // Refresh the session user so kyc_status reflects 'submitted'.
      try {
        setUser(await api.auth.me());
      } catch {
        /* ignore */
      }
      onSubmitted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gửi hồ sơ thất bại, thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {rejected && (
        <Banner tone="danger">
          <b>Hồ sơ bị từ chối.</b> {reason || 'Vui lòng kiểm tra lại giấy tờ và gửi lại.'}
        </Banner>
      )}

      {/* Roles */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="text-sm font-semibold">Bạn muốn đăng ký làm gì?</p>
          <RoleToggle
            icon={<Store className="h-5 w-5" />}
            title="Người bán cây"
            desc="Đăng bán cây, chậu, vật tư trên chợ Canopy."
            checked={seller}
            onChange={setSeller}
          />
          <RoleToggle
            icon={<Sprout className="h-5 w-5" />}
            title="Người chăm sóc cây"
            desc="Nhận dịch vụ chăm sóc cây cho người khác."
            checked={caretaker}
            onChange={setCaretaker}
          />
        </CardContent>
      </Card>

      {/* Document */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <Label>Loại giấy tờ</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDocType(d.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    docType === d.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-border-subtle text-content-secondary hover:border-brand-400',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="docnum">Số giấy tờ (tuỳ chọn)</Label>
            <Input
              id="docnum"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="VD: 0010xxxxxxxx"
              className="mt-1.5"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <DocPicker label="Mặt trước *" pic={front} onPick={setFront} />
            <DocPicker label="Mặt sau" pic={back} onPick={setBack} />
            <DocPicker label="Ảnh chân dung" pic={selfie} onPick={setSelfie} icon="selfie" />
          </div>
        </CardContent>
      </Card>

      {error && <Banner tone="danger">{error}</Banner>}

      <Button size="lg" className="w-full" onClick={submit} disabled={submitting}>
        {submitting ? (
          <>
            <Spinner className="h-5 w-5 animate-spin" /> Đang gửi hồ sơ…
          </>
        ) : (
          <>
            <ShieldCheck className="h-5 w-5" /> Gửi hồ sơ xác thực
          </>
        )}
      </Button>
    </div>
  );
}

function RoleToggle({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3 transition-colors',
        checked ? 'border-brand-300 bg-brand-50/50' : 'border-border-subtle',
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-content-tertiary">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function DocPicker({
  label,
  pic,
  onPick,
  icon = 'doc',
}: {
  label: string;
  pic: Pic | null;
  onPick: (p: Pic | null) => void;
  icon?: 'doc' | 'selfie';
}) {
  const ref = useRef<HTMLInputElement>(null);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      onPick(await fileToResizedBase64(file, 1400, 0.85));
    } catch {
      /* ignore */
    }
  };
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        {...(icon === 'selfie' ? { capture: 'user' as const } : {})}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {pic ? (
        <div className="relative mt-1.5 aspect-[4/3] overflow-hidden rounded-lg border border-border-subtle">
          <img src={pic.dataUrl} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onPick(null)}
            aria-label="Bỏ ảnh"
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="mt-1.5 flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border-strong text-content-tertiary transition-colors hover:border-brand-400 hover:text-brand-600"
        >
          {icon === 'selfie' ? <Camera className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
          <span className="text-xs">Tải ảnh</span>
        </button>
      )}
    </div>
  );
}

function Banner({ tone, children }: { tone: 'danger' | 'info'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm',
        tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-border-subtle bg-subtle text-content-secondary',
      )}
    >
      {tone === 'danger' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{children}</span>
    </div>
  );
}
