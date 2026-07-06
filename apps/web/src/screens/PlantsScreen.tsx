import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, Scan, Sprout } from '@/components/icons';
import { cn } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { getPlants, relTime, type Plant, type PlantHealth } from '@/features/plants/journal';

const HEALTH: Record<PlantHealth, { label: string; chip: string }> = {
  ok: { label: 'Khỏe', chip: 'border-brand-300 bg-brand-50 text-brand-700' },
  warning: { label: 'Cần điều chỉnh', chip: 'border-amber-300 bg-amber-50 text-amber-700' },
  disease: { label: 'Có dấu hiệu bệnh', chip: 'border-red-300 bg-red-50 text-red-700' },
  unknown: { label: 'Chưa rõ', chip: 'border-border-subtle bg-subtle text-content-secondary' },
};

export function PlantsScreen() {
  const user = useAuthStore((s) => s.user);
  const [plants, setPlants] = useState<Plant[]>([]);
  useEffect(() => {
    if (user) setPlants(getPlants(user.id));
  }, [user]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Khu vườn của tôi</h1>
          <p className="text-sm text-content-secondary">
            Theo dõi từng cây theo thời gian — AI nhớ các lần kiểm tra trước.
          </p>
        </div>
        <Link to="/scan?quick=1" className="btn btn-primary h-10 shrink-0 px-4 text-sm">
          <Scan className="h-4 w-4" /> Quét
        </Link>
      </div>

      {plants.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {plants.map((p) => (
            <PlantCard key={p.id} plant={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlantCard({ plant }: { plant: Plant }) {
  const h = HEALTH[plant.health] ?? HEALTH.unknown;
  return (
    <Link
      to={`/plants/${plant.id}`}
      className="group flex gap-3 overflow-hidden rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm transition-colors hover:border-brand-400"
    >
      {plant.cover ? (
        <img src={plant.cover} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <Sprout className="h-8 w-8" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate font-semibold">{plant.name}</p>
        {plant.species && (
          <p className="truncate text-xs italic text-content-tertiary">{plant.species}</p>
        )}
        <span
          className={cn(
            'mt-1.5 inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
            h.chip,
          )}
        >
          {plant.health === 'ok' ? (
            <Check className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          {h.label}
        </span>
        <p className="mt-auto pt-1.5 text-xs text-content-tertiary">
          {plant.checkIns.length} lần kiểm tra · {relTime(plant.updatedAt)}
        </p>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <Sprout className="h-7 w-7" />
      </span>
      <p className="font-semibold">Chưa có cây nào trong vườn</p>
      <p className="max-w-sm text-sm text-content-tertiary">
        Quét một cây rồi bấm “Lưu vào khu vườn” để bắt đầu theo dõi. Mỗi lần kiểm tra lại, AI sẽ so
        sánh với lần trước để biết cây tiến triển thế nào.
      </p>
      <Link to="/scan?quick=1" className="btn btn-primary mt-1 h-10 px-4 text-sm">
        <Scan className="h-4 w-4" /> Quét cây ngay
      </Link>
    </div>
  );
}
