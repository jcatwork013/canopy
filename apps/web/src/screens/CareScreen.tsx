import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CarePlan, CarePlanHealth, CarePlanStep, CareStepCategory } from '@canopy/shared';
import { ApiError } from '@canopy/shared';
import {
  Activity,
  AlertTriangle,
  Check,
  Droplet,
  Eye,
  Leaf,
  Scan,
  Spinner,
  Sprout,
  Sun,
  X,
} from '@/components/icons';
import { Card, CardContent, cn } from '@/components/ui';
import { api } from '@/lib/api';

const HEALTH: Record<CarePlanHealth, { label: string; chip: string; bar: string }> = {
  ok: { label: 'Khỏe mạnh · duy trì', chip: 'border-brand-300 bg-brand-50 text-brand-700', bar: 'bg-brand-500' },
  warning: {
    label: 'Chưa ổn · cần điều chỉnh',
    chip: 'border-amber-300 bg-amber-50 text-amber-700',
    bar: 'bg-amber-500',
  },
  disease: {
    label: 'Đang điều trị',
    chip: 'border-red-300 bg-red-50 text-red-700',
    bar: 'bg-red-500',
  },
};

const CATEGORY: Record<CareStepCategory, { label: string; icon: typeof Droplet }> = {
  water: { label: 'Tưới nước', icon: Droplet },
  fertilize: { label: 'Bón phân', icon: Sprout },
  light: { label: 'Ánh sáng', icon: Sun },
  soil: { label: 'Đất', icon: Leaf },
  prune: { label: 'Cắt tỉa', icon: Leaf },
  monitor: { label: 'Theo dõi', icon: Eye },
  treat: { label: 'Xử lý bệnh', icon: AlertTriangle },
  other: { label: 'Khác', icon: Activity },
};

export function CareScreen() {
  const [plans, setPlans] = useState<CarePlan[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.care
      .list()
      .then((p) => alive && setPlans(p))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Không tải được phác đồ.'));
    return () => {
      alive = false;
    };
  }, []);

  const removePlan = async (id: string) => {
    const prev = plans;
    setPlans((p) => p?.filter((x) => x.id !== id) ?? null);
    try {
      await api.care.remove(id);
    } catch {
      setPlans(prev ?? null); // roll back
    }
  };

  const patchPlan = (updated: CarePlan) =>
    setPlans((p) => p?.map((x) => (x.id === updated.id ? updated : x)) ?? null);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Chăm sóc cây</h1>
          <p className="text-sm text-content-secondary">Phác đồ chăm sóc do AI lập — làm theo từng bước.</p>
        </div>
        <Link to="/scan?mode=diagnose" className="btn btn-primary h-10 shrink-0 px-4 text-sm">
          + Lập phác đồ
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {plans === null && !error ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-content-tertiary">
          <Spinner className="h-5 w-5 animate-spin" /> Đang tải phác đồ…
        </div>
      ) : plans && plans.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {plans?.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onDelete={removePlan} onPatch={patchPlan} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <Leaf className="h-7 w-7" />
      </span>
      <p className="font-semibold">Chưa có phác đồ nào</p>
      <p className="max-w-sm text-sm text-content-tertiary">
        Quét hoặc chẩn đoán một cây, sau đó nhấn “Lên phác đồ chăm sóc” để AI lập kế hoạch chăm cây hiệu
        quả theo từng ngày.
      </p>
      <Link to="/scan?mode=diagnose" className="btn btn-primary mt-1 h-10 px-4 text-sm">
        <Scan className="h-4 w-4" /> Quét cây ngay
      </Link>
    </div>
  );
}

function PlanCard({
  plan,
  onDelete,
  onPatch,
}: {
  plan: CarePlan;
  onDelete: (id: string) => void;
  onPatch: (p: CarePlan) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const h = HEALTH[plan.health] ?? HEALTH.ok;
  const done = plan.steps.filter((s) => s.completed_at).length;
  const total = plan.steps.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const toggle = async (step: CarePlanStep) => {
    if (busy) return;
    setBusy(step.id);
    const nextDone = !step.completed_at;
    // optimistic
    onPatch({
      ...plan,
      steps: plan.steps.map((s) =>
        s.id === step.id ? { ...s, completed_at: nextDone ? new Date().toISOString() : null } : s,
      ),
    });
    try {
      await api.care.setStep(plan.id, step.id, nextDone);
    } catch {
      onPatch(plan); // roll back
    } finally {
      setBusy(null);
    }
  };

  // Group steps by day for a roadmap timeline.
  const byDay = new Map<number, CarePlanStep[]>();
  for (const s of plan.steps) {
    const arr = byDay.get(s.day_offset) ?? [];
    arr.push(s);
    byDay.set(s.day_offset, arr);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-border-subtle p-4">
        {plan.cover_url && (
          <img src={plan.cover_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', h.chip)}>
              {plan.health === 'ok' ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {h.label}
            </span>
            {plan.plant_name && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium italic text-brand-700">
                <Sprout className="h-3.5 w-3.5" />
                {plan.plant_name}
              </span>
            )}
          </div>
          <h2 className="mt-1.5 truncate text-lg font-bold">{plan.title}</h2>
          {plan.summary && <p className="text-sm text-content-secondary">{plan.summary}</p>}
        </div>
        <button
          onClick={() => onDelete(plan.id)}
          aria-label="Xoá phác đồ"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-content-tertiary hover:text-danger"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <CardContent className="space-y-4 pt-4">
        {/* Tổng quan định lượng nước / phân / sáng */}
        {(plan.watering || plan.fertilizer || plan.light) && (
          <div className="grid gap-2 sm:grid-cols-3">
            <Overview icon={Droplet} label="Nước" value={plan.watering} />
            <Overview icon={Sprout} label="Phân bón" value={plan.fertilizer} />
            <Overview icon={Sun} label="Ánh sáng" value={plan.light} />
          </div>
        )}

        {/* Tiến độ */}
        {total > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-content-tertiary">
              <span>Tiến độ</span>
              <span className="font-semibold text-content">
                {done}/{total} bước · {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-subtle">
              <div className={cn('h-full rounded-full transition-all', h.bar)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Roadmap theo ngày */}
        <div className="space-y-3">
          {days.map((day) => (
            <div key={day}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-content-tertiary">
                {day === 0 ? 'Ngay bây giờ' : `Ngày ${day}`}
              </p>
              <ul className="space-y-1.5">
                {byDay.get(day)!.map((s) => {
                  const cat = CATEGORY[s.category] ?? CATEGORY.other;
                  const Icon = cat.icon;
                  const checked = !!s.completed_at;
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-3 transition-colors',
                        checked ? 'border-brand-200 bg-brand-50/60' : 'border-border-subtle bg-surface',
                      )}
                    >
                      <button
                        onClick={() => toggle(s)}
                        disabled={busy === s.id}
                        aria-label={checked ? 'Bỏ đánh dấu' : 'Đánh dấu hoàn thành'}
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                          checked
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-border-strong text-transparent hover:border-brand-500',
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-content-secondary">
                            <Icon className="h-3 w-3" />
                            {cat.label}
                          </span>
                          {s.amount && (
                            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                              {s.amount}
                            </span>
                          )}
                        </div>
                        <p className={cn('mt-1 text-sm font-semibold', checked && 'text-content-tertiary line-through')}>
                          {s.title}
                        </p>
                        {s.description && (
                          <p className="text-sm text-content-secondary">{s.description}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {plan.warning_signs.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> Dấu hiệu cần chú ý
            </p>
            <ul className="space-y-1">
              {plan.warning_signs.map((w, i) => (
                <li key={i} className="flex gap-2 text-sm text-amber-800">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.prevention && (
          <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700">
            <span className="font-semibold">Phòng ngừa: </span>
            {plan.prevention}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Overview({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Droplet;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border-subtle px-3 py-2">
      <p className="flex items-center gap-1 text-xs font-medium text-content-tertiary">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-0.5 text-sm text-content">{value}</p>
    </div>
  );
}
