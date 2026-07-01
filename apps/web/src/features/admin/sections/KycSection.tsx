import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminKycSubmission } from '@canopy/shared';
import { Check, ShieldCheck, Spinner, Sprout, Store, X } from '@/components/icons';
import { Button, Card, CardContent } from '@/components/ui';
import { api } from '@/lib/api';

const DOC_VI: Record<string, string> = {
  national_id: 'Căn cước công dân',
  passport: 'Hộ chiếu',
  driver_license: 'Giấy phép lái xe',
};

export function KycSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kyc'],
    queryFn: () => api.admin.listKyc(),
  });
  const submissions = data?.submissions ?? [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'kyc'] });
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-content-tertiary">
        <Spinner className="h-5 w-5 animate-spin" /> Đang tải hồ sơ…
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <p className="font-semibold">Không có hồ sơ nào đang chờ duyệt</p>
          <p className="text-sm text-content-tertiary">Các hồ sơ KYC mới sẽ xuất hiện ở đây.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((s) => (
        <KycCard key={s.id} sub={s} onDone={refresh} />
      ))}
    </div>
  );
}

function KycCard({ sub, onDone }: { sub: AdminKycSubmission; onDone: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  const approve = useMutation({
    mutationFn: () => api.admin.approveKyc(sub.id),
    onSuccess: onDone,
    onError: () => setErr('Duyệt thất bại, thử lại.'),
  });
  const reject = useMutation({
    mutationFn: () => api.admin.rejectKyc(sub.id, reason.trim()),
    onSuccess: onDone,
    onError: () => setErr('Từ chối thất bại, thử lại.'),
  });
  const busy = approve.isPending || reject.isPending;

  const roles = [
    sub.requested_seller && { icon: Store, label: 'Người bán' },
    sub.requested_caretaker && { icon: Sprout, label: 'Người chăm sóc' },
  ].filter(Boolean) as { icon: typeof Store; label: string }[];

  const docs = [
    { url: sub.front_url, label: 'Mặt trước' },
    { url: sub.back_url, label: 'Mặt sau' },
    { url: sub.selfie_url, label: 'Chân dung' },
  ].filter((d) => d.url);

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{sub.user_full_name || sub.user_email}</p>
            <p className="text-sm text-content-tertiary">{sub.user_email}</p>
            <p className="mt-1 text-xs text-content-tertiary">
              {DOC_VI[sub.document_type] ?? sub.document_type}
              {sub.document_number ? ` · ${sub.document_number}` : ''} ·{' '}
              {new Date(sub.created_at).toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => {
              const Icon = r.icon;
              return (
                <span
                  key={r.label}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {r.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Documents */}
        <div className="flex flex-wrap gap-3">
          {docs.map((d) => (
            <a
              key={d.label}
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block h-28 w-40 overflow-hidden rounded-lg border border-border-subtle"
            >
              <img src={d.url} alt={d.label} className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-0.5 text-[11px] text-white">
                {d.label}
              </span>
            </a>
          ))}
          {docs.length === 0 && (
            <p className="text-sm text-content-tertiary">Không xem được ảnh (kiểm tra cấu hình lưu trữ).</p>
          )}
        </div>

        {err && <p className="text-sm text-danger">{err}</p>}

        {/* Actions */}
        {rejecting ? (
          <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Lý do từ chối (gửi tới người dùng)…"
              rows={2}
              className="w-full rounded-lg border border-border-subtle bg-input px-3 py-2 text-sm focus-visible:outline-none"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRejecting(false);
                  setReason('');
                }}
                disabled={busy}
              >
                Huỷ
              </Button>
              <Button
                size="sm"
                className="bg-danger text-white hover:bg-danger/90"
                onClick={() => reject.mutate()}
                disabled={busy || !reason.trim()}
              >
                {reject.isPending ? <Spinner className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => approve.mutate()} disabled={busy}>
              {approve.isPending ? <Spinner className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Duyệt & cấp vai trò
            </Button>
            <Button variant="outline" onClick={() => setRejecting(true)} disabled={busy}>
              <X className="h-4 w-4" />
              Từ chối
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
