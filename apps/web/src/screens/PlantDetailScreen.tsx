import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Pencil, Scan, Sprout, X } from '@/components/icons';
import { Button, Input, cn } from '@/components/ui';
import { ChatPanel } from '@/components/ChatPanel';
import { useAuthStore } from '@/store/auth';
import {
  buildMemory,
  fmtDate,
  getPlant,
  relTime,
  removePlant,
  renamePlant,
  type CheckIn,
  type Plant,
  type PlantHealth,
} from '@/features/plants/journal';

const HEALTH: Record<PlantHealth, { label: string; chip: string }> = {
  ok: { label: 'Khỏe mạnh', chip: 'border-brand-300 bg-brand-50 text-brand-700' },
  warning: { label: 'Cần điều chỉnh', chip: 'border-amber-300 bg-amber-50 text-amber-700' },
  disease: { label: 'Có dấu hiệu bệnh', chip: 'border-red-300 bg-red-50 text-red-700' },
  unknown: { label: 'Chưa rõ', chip: 'border-border-subtle bg-subtle text-content-secondary' },
};

/** Split a `data:<mime>;base64,<data>` URL so ChatPanel can carry the image. */
function splitDataUrl(url?: string): { base64: string; mime: string } | null {
  if (!url?.startsWith('data:')) return null;
  const m = /^data:([^;]+);base64,(.*)$/.exec(url);
  return m ? { mime: m[1]!, base64: m[2]! } : null;
}

export function PlantDetailScreen() {
  const { id = '' } = useParams();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [plant, setPlant] = useState<Plant | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!user) return;
    const p = getPlant(user.id, id);
    setPlant(p ?? null);
    if (p) setName(p.name);
  }, [user, id]);

  const cover = useMemo(() => splitDataUrl(plant?.cover), [plant?.cover]);
  const memory = useMemo(() => (plant ? buildMemory(plant) : undefined), [plant]);

  if (plant === undefined) return null; // hydrating
  if (plant === null) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="font-semibold">Không tìm thấy cây này</p>
        <Link to="/plants" className="btn btn-ghost mt-3 h-10 px-4 text-sm">
          Về khu vườn
        </Link>
      </div>
    );
  }

  const h = HEALTH[plant.health] ?? HEALTH.unknown;

  const saveName = () => {
    if (!user) return;
    const updated = renamePlant(user.id, plant.id, name);
    if (updated) setPlant(updated);
    setEditing(false);
  };
  const del = () => {
    if (!user) return;
    if (!confirm('Xoá cây này khỏi khu vườn? Toàn bộ lịch sử kiểm tra sẽ mất.')) return;
    removePlant(user.id, plant.id);
    navigate('/plants');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/plants" className="inline-flex items-center gap-1 text-sm text-content-secondary hover:text-content">
        <ArrowLeft className="h-4 w-4" /> Khu vườn
      </Link>

      {/* Header */}
      <div className="flex gap-4">
        {plant.cover ? (
          <img src={plant.cover} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <Sprout className="h-10 w-10" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 flex-1" autoFocus />
              <Button size="sm" onClick={saveName}>
                Lưu
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{plant.name}</h1>
              <button
                onClick={() => setEditing(true)}
                aria-label="Đổi tên"
                className="mt-1.5 text-content-tertiary hover:text-content"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          {plant.species && <p className="truncate text-sm italic text-content-tertiary">{plant.species}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', h.chip)}>
              {plant.health === 'ok' ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {h.label}
            </span>
            <span className="text-xs text-content-tertiary">Cập nhật {relTime(plant.updatedAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Link to={`/scan?mode=diagnose&plant=${plant.id}`} className="btn btn-primary h-11 flex-1 text-sm">
          <Scan className="h-5 w-5" /> Kiểm tra lại tình trạng
        </Link>
        <button onClick={del} aria-label="Xoá cây" className="btn btn-ghost h-11 shrink-0 px-3 text-danger">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Timeline */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-content-secondary">Dòng thời gian kiểm tra</h2>
        <ol className="space-y-3">
          {plant.checkIns.map((c, idx) => (
            <TimelineItem key={c.id} checkIn={c} latest={idx === 0} />
          ))}
        </ol>
      </div>

      {/* AI with memory of this exact plant */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-content-secondary">Hỏi AI về cây này</h2>
        <ChatPanel
          storageKey={`canopy-plant-chat-${plant.id}`}
          {...(cover ? { imageBase64: cover.base64, mimeType: cover.mime } : {})}
          plantName={plant.name}
          memory={memory}
          intro={`SynapX Pro AI đã ghi nhớ ${plant.checkIns.length} lần kiểm tra của "${plant.name}". Hỏi bất cứ điều gì — AI sẽ so sánh theo thời gian.`}
          seedQuestions={[
            'Cây tiến triển thế nào so với lần trước?',
            'Giờ nên chăm sóc ra sao?',
            'Có dấu hiệu nào cần lo không?',
          ]}
        />
      </div>
    </div>
  );
}

function TimelineItem({ checkIn: c, latest }: { checkIn: CheckIn; latest: boolean }) {
  const h = HEALTH[c.health] ?? HEALTH.unknown;
  return (
    <li className="relative flex gap-3">
      {/* rail */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'mt-1 h-3 w-3 shrink-0 rounded-full border-2',
            latest ? 'border-brand-600 bg-brand-600' : 'border-border-strong bg-surface',
          )}
        />
        <span className="w-px flex-1 bg-border-subtle" />
      </div>
      <div className="flex-1 rounded-2xl border border-border-subtle bg-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-content">{fmtDate(c.at)}</p>
          <span className="text-xs text-content-tertiary">{relTime(c.at)}</span>
        </div>
        <div className="mt-1.5 flex gap-3">
          {c.thumb && <img src={c.thumb} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0">
            <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', h.chip)}>
              {c.health === 'ok' ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {h.label}
            </span>
            <p className="mt-1 text-sm font-semibold">{c.title}</p>
            <p className="text-sm text-content-secondary">{c.summary}</p>
            {c.note && <p className="mt-1 text-xs italic text-content-tertiary">“{c.note}”</p>}
          </div>
        </div>
      </div>
    </li>
  );
}
