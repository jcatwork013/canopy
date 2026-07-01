import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CarePlanHealth, DiagnoseResult, IdentifyResult } from '@canopy/shared';
import { AI_DISCLAIMER, ApiError } from '@canopy/shared';
import { Button, Card, CardContent, CardHeader, CardTitle, cn } from '@/components/ui';
import { AlertTriangle, Camera, Check, Leaf, Scan, Sparkles, Spinner, Sprout, Upload, X } from '@/components/icons';
import { ScanLeaf } from '@/components/illustrations';
import { ChatPanel } from '@/components/ChatPanel';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { addHistory, getHistory, removeHistory, type HistoryItem } from '@/features/scan/history';

const AI_NAME = 'SynapX Pro AI';

type Mode = 'identify' | 'diagnose';
type Status = 'idle' | 'scanning' | 'done' | 'error';
type Result =
  | { kind: 'identify'; data: IdentifyResult }
  | { kind: 'diagnose'; data: DiagnoseResult };

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ScanScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode: Mode = params.get('mode') === 'diagnose' ? 'diagnose' : 'identify';
  const title = mode === 'diagnose' ? 'Chẩn đoán bệnh' : 'Nhận diện cây';

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [chatCtx, setChatCtx] = useState<{ base64: string; mime: string } | null>(null);
  const [histThumb, setHistThumb] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const user = useAuthStore((s) => s.user);
  const [history, setHistory] = useState<HistoryItem[]>(() => (user ? getHistory(user.id) : []));

  useEffect(() => {
    setFiles([]);
    setStatus('idle');
    setResult(null);
    setError('');
  }, [mode]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  // Open a past scan when navigated with ?history=<id> (e.g. from Profile).
  const histId = params.get('history');
  useEffect(() => {
    if (!histId || !user) return;
    const item = getHistory(user.id).find((h) => h.id === histId);
    if (item) {
      setResult(item.result);
      setHistThumb(item.thumb);
      setStatus('done');
    }
  }, [histId, user]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (!imgs.length) return;
    setFiles((prev) => (mode === 'diagnose' ? [...prev, ...imgs].slice(0, 5) : imgs.slice(0, 1)));
    setStatus('idle');
    setResult(null);
    setError('');
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const scan = async () => {
    if (!files.length) return;
    setStatus('scanning');
    setError('');
    try {
      const [res] = await Promise.all([analyze(files, mode), delay(2000)]);
      setResult(res);
      setHistThumb(null);
      setStatus('done');
      toResizedBase64(files[0]!)
        .then((c) => setChatCtx(c))
        .catch(() => undefined);
      // Save to the user's history so they can revisit without re-paying for AI.
      if (user) {
        toResizedBase64(files[0]!, 360, 0.6)
          .then(({ base64, mime }) => {
            const item: HistoryItem = {
              id: String(Date.now()),
              mode,
              title:
                res.data.is_plant === false
                  ? 'Không phải cây'
                  : res.kind === 'identify'
                    ? res.data.scientific_name
                    : res.data.disease_name,
              thumb: `data:${mime};base64,${base64}`,
              createdAt: Date.now(),
              result: res,
            };
            setHistory(addHistory(user.id, item));
          })
          .catch(() => undefined);
      }
    } catch (e) {
      setError(friendlyError(e));
      setStatus('error');
    }
  };

  const reset = () => {
    setFiles([]);
    setStatus('idle');
    setResult(null);
    setError('');
    setHistThumb(null);
  };

  const openHistory = (item: HistoryItem) => {
    setResult(item.result);
    setHistThumb(item.thumb);
    setChatCtx(null);
    setFiles([]);
    setError('');
    setStatus('done');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteHistory = (id: string) => {
    if (user) setHistory(removeHistory(user.id, id));
  };

  // Generate + save a care roadmap from the current result, then open the Care tab.
  const makePlan = async () => {
    if (!result || result.data.is_plant === false || planning) return;
    setPlanning(true);
    setPlanError('');
    try {
      let cover: string | undefined = histThumb ?? undefined;
      if (!cover && files[0]) {
        const { base64, mime } = await toResizedBase64(files[0], 360, 0.6);
        cover = `data:${mime};base64,${base64}`;
      }
      await api.care.generate({
        plant_name: planName(result),
        source: result.kind,
        health_hint: healthHint(result),
        context: planContext(result),
        ...(cover ? { cover_url: cover } : {}),
      });
      navigate('/care');
    } catch (e) {
      setPlanError(friendlyError(e));
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div
      className={cn(
        'mx-auto space-y-5',
        files.length > 0 && status !== 'done' ? 'max-w-2xl' : 'max-w-5xl',
      )}
    >
      <header className="flex items-center gap-3">
        <span className="icon-tile flex h-12 w-12 items-center justify-center rounded-2xl">
          {mode === 'diagnose' ? <Sprout className="h-6 w-6" /> : <Scan className="h-6 w-6" />}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
          <p className="flex items-center gap-1 text-sm text-content-secondary">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            Hỗ trợ bởi {AI_NAME}
          </p>
        </div>
      </header>

      {/* hidden inputs (always mounted so camera/gallery work in any state) */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={mode === 'diagnose'}
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={mode === 'diagnose'}
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {files.length === 0 && status !== 'done' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Upload zone — spans wider */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn(
              'flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-10 lg:col-span-2',
              dragging ? 'border-brand-500 bg-brand-50' : 'border-border-strong bg-surface',
            )}
          >
            <ScanLeaf className="h-24 w-auto sm:h-28" />
            <div>
              <p className="font-semibold">Tải ảnh lên hoặc chụp trực tiếp</p>
              <p className="mt-0.5 text-sm text-content-tertiary">
                Kéo-thả vào đây · PNG/JPG · tối đa {mode === 'diagnose' ? '5 ảnh' : '1 ảnh'}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => galleryRef.current?.click()}>
                <Upload className="h-5 w-5" />
                Tải ảnh lên
              </Button>
              <Button variant="outline" onClick={() => cameraRef.current?.click()}>
                <Camera className="h-5 w-5" />
                Chụp ảnh
              </Button>
            </div>
          </div>

          {/* Side panel: history or tips */}
          <aside className="lg:col-span-1">
            {user && history.length > 0 ? (
              <ScanHistory items={history} onOpen={openHistory} onDelete={deleteHistory} />
            ) : (
              <div className="card h-full space-y-2 p-5">
                <h2 className="text-sm font-semibold">Mẹo chụp ảnh</h2>
                <ul className="space-y-2 text-sm text-content-secondary">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    Đủ sáng, nền đơn giản, lấy nét vào lá.
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {mode === 'diagnose'
                      ? 'Chụp cận cảnh vùng bệnh + 1 ảnh toàn cây.'
                      : 'Lấy trọn dáng cây hoặc lá đặc trưng.'}
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    Sau khi quét có thể chat hỏi thêm với {AI_NAME}.
                  </li>
                </ul>
              </div>
            )}
          </aside>
        </div>
      ) : status !== 'done' ? (
        <Card className="overflow-hidden">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#0b0f0d] sm:aspect-[4/3]">
            <img
              src={previews[0]}
              alt="Ảnh xem trước"
              className={cn(
                'h-full w-full object-cover transition-transform duration-[6000ms] ease-out',
                status === 'scanning' && 'scale-105',
              )}
            />
            {status === 'scanning' && (
              <>
                <div className="scan-grid absolute inset-0" />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: 'radial-gradient(circle at center, transparent 48%, rgba(0,0,0,0.55))' }}
                />
                <div className="scan-line" />
                {/* camera-style focus reticle */}
                <div className="pointer-events-none absolute inset-5">
                  {[
                    'left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-xl',
                    'right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-xl',
                    'left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-xl',
                    'right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-xl',
                  ].map((c) => (
                    <span
                      key={c}
                      className={cn('absolute h-8 w-8 border-brand-400 anim-fade', c)}
                      style={{ filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.6))' }}
                    />
                  ))}
                </div>
                <span className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/70 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-brand-300" />
                  {AI_NAME} đang phân tích…
                </span>
              </>
            )}
          </div>

          {files.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {previews.map((src, i) => (
                <div key={i} className="relative h-16 w-16 shrink-0">
                  <img src={src} alt="" className="h-16 w-16 rounded-md object-cover" />
                  {status !== 'scanning' && (
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white"
                      aria-label="Xoá ảnh"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <CardContent className="space-y-3 pt-4">
            {status === 'error' && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={scan}
                  disabled={status === 'scanning'}
                >
                  {status === 'scanning' ? (
                    <>
                      <Spinner className="h-5 w-5 animate-spin" />
                      Đang phân tích…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Phân tích với {AI_NAME}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={reset}
                  disabled={status === 'scanning'}
                >
                  Chọn ảnh khác
                </Button>
                {mode === 'diagnose' && status !== 'scanning' && (
                  <Button variant="ghost" size="lg" onClick={() => galleryRef.current?.click()}>
                    + Thêm ảnh
                  </Button>
                )}
              </div>
          </CardContent>
        </Card>
      ) : result ? (
        // Result — desktop: image left, info right; both animate in.
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="anim-fade overflow-hidden rounded-2xl border border-border-subtle bg-[#0b0f0d] lg:sticky lg:top-24">
            <img
              src={previews[0] ?? histThumb ?? ''}
              alt="Ảnh đã quét"
              className="aspect-[4/5] w-full object-cover sm:aspect-[4/3] lg:aspect-[4/5]"
            />
          </div>

          <div className="anim-fade-up space-y-5">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
              <Sparkles className="h-4 w-4" />
              Kết quả từ {AI_NAME}
            </div>
            {result.data.is_plant === false ? (
              <NotPlantNotice />
            ) : result.kind === 'identify' ? (
              <IdentifyView data={result.data} />
            ) : (
              <DiagnoseView data={result.data} />
            )}

            {result.data.is_plant !== false && (
              <div className="space-y-2">
                <Button className="w-full" onClick={makePlan} disabled={planning}>
                  {planning ? (
                    <>
                      <Spinner className="h-5 w-5 animate-spin" /> Đang lập phác đồ…
                    </>
                  ) : (
                    <>
                      <Leaf className="h-5 w-5" /> Lên phác đồ chăm sóc
                    </>
                  )}
                </Button>
                {planError && <p className="text-sm text-danger">{planError}</p>}
              </div>
            )}

            <ChatPanel
              storageKey={`canopy-chat-${mode}`}
              imageBase64={chatCtx?.base64}
              mimeType={chatCtx?.mime}
              plantName={result.data.is_plant === false ? undefined : planName(result)}
              intro="Trò chuyện với SynapX Pro AI về cây này — cách chữa trị, chăm sóc, phòng ngừa…"
              seedQuestions={
                mode === 'diagnose'
                  ? ['Cách chữa trị chi tiết?', 'Làm sao phòng ngừa tái phát?', 'Có cần cách ly cây không?']
                  : ['Cách chăm sóc hằng ngày?', 'Hợp khí hậu Việt Nam không?', 'Bao lâu tưới một lần?']
              }
            />

            <Button variant="outline" className="w-full" onClick={reset}>
              Quét ảnh khác
            </Button>
          </div>
        </div>
      ) : null}

      <p className="rounded-md bg-subtle px-3 py-2 text-[11px] leading-snug text-content-tertiary">
        {AI_DISCLAIMER}
      </p>
    </div>
  );
}

function NotPlantNotice() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Sprout className="h-7 w-7" />
        </span>
        <div>
          <p className="text-lg font-semibold">Hình ảnh chưa phải là cây</p>
          <p className="mt-1 text-sm text-content-secondary">
            SynapX Pro AI chưa nhận ra cây hay lá trong ảnh này. Bạn thử chụp lại rõ hơn — lấy trọn
            cây hoặc cận cảnh chiếc lá — để được nhận diện chính xác nhé. 🌿
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-content-tertiary">
        <span>Độ tin cậy</span>
        <span className="font-semibold text-content">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-subtle">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundImage: 'var(--grad-brand)' }} />
      </div>
    </div>
  );
}

function IdentifyView({ data }: { data: IdentifyResult }) {
  const c = data.care_profile;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl italic">{data.scientific_name}</CardTitle>
        <p className="text-sm text-content-secondary">{data.common_names?.join(', ')}</p>
        {data.family && (
          <span className="mt-1 inline-flex w-fit rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium text-content-secondary">
            Họ {data.family}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <ConfidenceBar value={data.confidence} />
        {data.characteristics?.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-semibold">Đặc điểm nhận dạng</p>
            <ul className="space-y-1">
              {data.characteristics.map((x, i) => (
                <li key={i} className="flex gap-2 text-sm text-content-secondary">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="mb-2 text-sm font-semibold">Hướng dẫn chăm sóc</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <CareItem label="Tưới nước" value={c.watering} />
            <CareItem label="Ánh sáng" value={c.light} />
            <CareItem label="Đất" value={c.soil} />
            <CareItem label="Nhiệt độ" value={c.temperature} />
            <CareItem label="Độ ẩm" value={c.humidity} />
            <CareItem label="Phân bón" value={c.fertilizer} />
          </div>
          {c.special_notes?.length > 0 && (
            <ul className="mt-2 space-y-1 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
              {c.special_notes.map((x, i) => (
                <li key={i}>• {x}</li>
              ))}
            </ul>
          )}
        </div>
        {data.alternatives?.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-semibold">Khả năng khác</p>
            <div className="flex flex-wrap gap-2">
              {data.alternatives.map((a, i) => (
                <span key={i} className="rounded-full border border-border-subtle px-3 py-1 text-xs italic text-content-secondary">
                  {a.scientific_name} · {Math.round(a.confidence * 100)}%
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SEVERITY = {
  severe: {
    label: 'Nghiêm trọng',
    msg: 'Cần xử lý ngay để cứu cây.',
    banner: 'border-red-300 bg-red-100 text-red-800 shadow-[0_4px_16px_rgba(220,38,38,0.18)]',
    action: 'border-red-300 bg-red-50',
    actionText: 'text-red-800',
    actionIcon: 'text-red-600',
  },
  moderate: {
    label: 'Trung bình',
    msg: 'Cần theo dõi và xử lý sớm, tránh lan rộng.',
    banner: 'border-amber-300 bg-amber-100 text-amber-900 shadow-[0_4px_16px_rgba(217,119,6,0.16)]',
    action: 'border-amber-300 bg-amber-50',
    actionText: 'text-amber-900',
    actionIcon: 'text-amber-600',
  },
  mild: {
    label: 'Nhẹ',
    msg: 'Theo dõi và chăm sóc bình thường.',
    banner: 'border-brand-300 bg-brand-100 text-brand-800 shadow-[0_4px_16px_rgba(22,163,74,0.16)]',
    action: 'border-brand-200 bg-brand-50',
    actionText: 'text-brand-700',
    actionIcon: 'text-brand-600',
  },
} as const;

const CATEGORY_VI: Record<string, string> = {
  healthy: 'Khỏe mạnh',
  fungal: 'Nấm bệnh',
  bacterial: 'Vi khuẩn',
  viral: 'Virus',
  pest: 'Sâu / côn trùng',
  nutrient: 'Thiếu dinh dưỡng',
  environmental: 'Môi trường',
  unknown: 'Chưa xác định',
};

function DiagnoseView({ data }: { data: DiagnoseResult }) {
  const healthy = data.category === 'healthy';
  const s = SEVERITY[data.severity as keyof typeof SEVERITY] ?? SEVERITY.mild;
  const actionTitle = healthy ? 'Chăm sóc duy trì' : 'Cần làm ngay';

  return (
    <div className="space-y-4">
      {/* Trạng thái — xanh nếu khỏe, vàng/đỏ theo mức độ bệnh */}
      {healthy ? (
        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-brand-700">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
            <Check className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="font-semibold">Cây khỏe mạnh 🌿</p>
            <p className="text-sm opacity-90">Không phát hiện vấn đề rõ rệt. Tiếp tục chăm sóc tốt nhé!</p>
          </div>
        </div>
      ) : (
        <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', s.banner)}>
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Mức độ: {s.label}</p>
            <p className="text-sm opacity-90">{s.msg}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{data.disease_name}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {data.plant && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium italic text-brand-700">
                <Sprout className="h-3.5 w-3.5" />
                {data.plant}
              </span>
            )}
            {data.category && !healthy && (
              <span className="inline-flex w-fit rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium text-content-secondary">
                {CATEGORY_VI[data.category] ?? data.category}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ConfidenceBar value={data.confidence} />

          {data.immediate_actions?.length > 0 && (
            <div className={cn('rounded-xl border p-4', healthy ? SEVERITY.mild.action : s.action)}>
              <p
                className={cn(
                  'mb-1.5 flex items-center gap-1.5 text-sm font-bold',
                  healthy ? SEVERITY.mild.actionText : s.actionText,
                )}
              >
                {healthy ? (
                  <Sprout className={cn('h-4 w-4', SEVERITY.mild.actionIcon)} />
                ) : (
                  <AlertTriangle className={cn('h-4 w-4', s.actionIcon)} />
                )}
                {actionTitle}
              </p>
              <ul className="space-y-1.5">
                {data.immediate_actions.map((x, i) => (
                  <li
                    key={i}
                    className={cn('flex gap-2 text-sm', healthy ? SEVERITY.mild.actionText : s.actionText)}
                  >
                    <Check
                      className={cn('mt-0.5 h-4 w-4 shrink-0', healthy ? SEVERITY.mild.actionIcon : s.actionIcon)}
                    />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ResultList title="Triệu chứng quan sát" items={data.observed_symptoms} icon="dot" />
          <ResultList title="Nguyên nhân khả dĩ" items={data.likely_causes} icon="dot" />
          <ResultList title="Cần thêm thông tin" items={data.needs_more_info} icon="dot" />
        </CardContent>
      </Card>
    </div>
  );
}

function CareItem({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border-subtle px-3 py-2">
      <p className="text-xs font-medium text-content-tertiary">{label}</p>
      <p className="text-sm text-content">{value}</p>
    </div>
  );
}

function ResultList({
  title,
  items,
  icon,
  highlight,
}: {
  title: string;
  items: string[];
  icon: 'dot' | 'check';
  highlight?: boolean;
}) {
  if (!items?.length) return null;
  return (
    <div className={highlight ? 'rounded-lg bg-brand-50 p-3' : undefined}>
      <p className={cn('mb-1.5 text-sm font-semibold', highlight && 'text-brand-700')}>{title}</p>
      <ul className="space-y-1">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2 text-sm text-content-secondary">
            {icon === 'check' ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            ) : (
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong" />
            )}
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- image pipeline: resize client-side, then base64 (keeps payload small) ---

async function analyze(files: File[], mode: Mode): Promise<Result> {
  if (mode === 'identify') {
    const { base64, mime } = await toResizedBase64(files[0]!);
    return { kind: 'identify', data: await api.ai.identify({ image_base64: base64, mime_type: mime }) };
  }
  const imgs = await Promise.all(files.map((f) => toResizedBase64(f)));
  return {
    kind: 'diagnose',
    data: await api.ai.diagnose({ images_base64: imgs.map((i) => i.base64), mime_type: 'image/jpeg' }),
  };
}

function toResizedBase64(file: File, maxDim = 1024, quality = 0.8): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas'));
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({ base64: dataUrl.split(',')[1] ?? '', mime: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    img.src = url;
  });
}

function ScanHistory({
  items,
  onOpen,
  onDelete,
}: {
  items: HistoryItem[];
  onOpen: (i: HistoryItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-content-secondary">Lịch sử quét</h2>
        <span className="text-xs text-content-tertiary">· mở lại không tốn AI</span>
      </div>
      <div className="grid max-h-[420px] gap-2 overflow-y-auto">
        {items.map((h) => (
          <div
            key={h.id}
            className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-surface p-2 pr-3 transition-colors hover:border-brand-400"
          >
            <button onClick={() => onOpen(h)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <img src={h.thumb} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-content">{h.title}</p>
                <p className="text-xs text-content-tertiary">
                  {h.mode === 'diagnose' ? 'Chẩn đoán' : 'Nhận diện'}
                </p>
              </div>
            </button>
            <button
              onClick={() => onDelete(h.id)}
              aria-label="Xoá"
              className="flex h-7 w-7 items-center justify-center rounded-md text-content-tertiary opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- care-roadmap helpers: turn a scan result into generation context --------

function planName(r: Result): string {
  return r.kind === 'identify'
    ? r.data.scientific_name
    : r.data.plant || r.data.disease_name || 'Cây của tôi';
}

function healthHint(r: Result): CarePlanHealth {
  if (r.kind === 'identify') return 'ok';
  if (r.data.category === 'healthy') return 'ok';
  return r.data.severity === 'mild' ? 'warning' : 'disease';
}

function planContext(r: Result): string {
  if (r.kind === 'identify') {
    const c = r.data.care_profile;
    return [
      `Loài: ${r.data.scientific_name} (${r.data.common_names?.join(', ')})`,
      r.data.characteristics?.length ? `Đặc điểm: ${r.data.characteristics.join('; ')}` : '',
      `Chăm sóc tham khảo — Nước: ${c.watering}; Ánh sáng: ${c.light}; Đất: ${c.soil}; Nhiệt độ: ${c.temperature}; Độ ẩm: ${c.humidity}; Phân bón: ${c.fertilizer}`,
    ]
      .filter(Boolean)
      .join('\n');
  }
  return [
    `Cây: ${r.data.plant || 'chưa rõ'}`,
    `Chẩn đoán: ${r.data.disease_name} (${r.data.category}, mức độ ${r.data.severity})`,
    r.data.observed_symptoms?.length ? `Triệu chứng: ${r.data.observed_symptoms.join('; ')}` : '',
    r.data.likely_causes?.length ? `Nguyên nhân: ${r.data.likely_causes.join('; ')}` : '',
    r.data.immediate_actions?.length ? `Việc cần làm ngay: ${r.data.immediate_actions.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function friendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Vui lòng đăng nhập để dùng SynapX Pro AI.';
    return e.message || 'AI gặp lỗi, vui lòng thử lại.';
  }
  return 'Không xử lý được ảnh. Vui lòng thử ảnh khác.';
}
