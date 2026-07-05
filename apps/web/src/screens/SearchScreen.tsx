import { useMemo, useState } from 'react';
import { AI_DISCLAIMER } from '@canopy/shared';
import {
  AlertTriangle,
  ArrowRight,
  Droplet,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  X,
} from '@/components/icons';
import { cn } from '@/components/ui';
import { ChatPanel } from '@/components/ChatPanel';
import { PlantImage } from '@/features/search/PlantImage';
import { FACETS, PLANTS, searchPlants, type Facet, type Plant } from '@/features/search/plantCatalog';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [facets, setFacets] = useState<Facet[]>([]);
  const [selected, setSelected] = useState<Plant | null>(null);
  const [askAI, setAskAI] = useState(false);

  const results = useMemo(() => searchPlants(query, facets), [query, facets]);

  const toggle = (f: Facet) =>
    setFacets((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Heading */}
      <header className="space-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          <Sparkles className="h-3.5 w-3.5" /> Thư viện cây
        </span>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Tra cứu cây trồng</h1>
        <p className="text-sm text-content-secondary">
          Tìm theo tên, đặc điểm hoặc nhu cầu chăm sóc — {PLANTS.length}+ loài phổ biến.
        </p>
      </header>

      {/* Sticky search + filters */}
      <div className="sticky top-16 z-20 -mx-1 space-y-3 rounded-2xl bg-base px-1 py-2 lg:top-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-content-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Trầu bà, lưỡi hổ, cây lọc không khí…"
            className="input input-icon !h-14 pr-11 text-base shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Xoá"
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-content-tertiary hover:bg-subtle"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FACETS.map((f) => {
            const on = facets.includes(f.key);
            return (
              <button
                key={f.key}
                onClick={() => toggle(f.key)}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  on
                    ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                    : 'border-border-subtle bg-surface text-content-secondary hover:border-brand-300 hover:text-brand-700',
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between px-0.5">
        <p className="text-sm text-content-tertiary">
          {results.length > 0 ? `${results.length} kết quả` : 'Không có kết quả phù hợp'}
        </p>
        {facets.length > 0 && (
          <button onClick={() => setFacets([])} className="text-sm font-medium text-brand-700 hover:underline">
            Xoá bộ lọc
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((p) => (
            <PlantCard key={p.id} plant={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      ) : (
        <EmptyState query={query} onAsk={() => setAskAI(true)} />
      )}

      {/* Ask-AI fallback CTA (always available) */}
      <button
        onClick={() => setAskAI(true)}
        className="ring-grad flex w-full items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-4 text-left transition-shadow hover:shadow-md"
      >
        <span className="icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <Sparkles className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Không thấy cây bạn cần?</span>
          <span className="block text-sm text-content-tertiary">
            Hỏi trợ lý AI về bất kỳ loài cây hay vấn đề chăm sóc nào.
          </span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0 text-content-tertiary" />
      </button>

      {selected && <PlantSheet plant={selected} onClose={() => setSelected(null)} />}
      {askAI && (
        <AskAISheet
          query={query}
          onClose={() => setAskAI(false)}
        />
      )}
    </div>
  );
}

function PlantCard({ plant, onClick }: { plant: Plant; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lift group flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface text-left shadow-sm"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <PlantImage
          plant={plant}
          sizes="(min-width:1024px) 220px, (min-width:640px) 30vw, 45vw"
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        />
        {plant.petSafe && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-brand-700 shadow-sm backdrop-blur">
            <ShieldCheck className="h-3 w-3" /> Thú cưng
          </span>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <div>
          <p className="truncate font-semibold leading-tight">{plant.name}</p>
          <p className="truncate text-xs italic text-content-tertiary">{plant.scientific}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <MiniBadge icon={Sun} text={plant.light} />
          <MiniBadge icon={Droplet} text={plant.water} />
        </div>
      </div>
    </button>
  );
}

function MiniBadge({ icon: Icon, text }: { icon: typeof Sun; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-content-secondary">
      <Icon className="h-3 w-3 text-brand-600" />
      {text}
    </span>
  );
}

function EmptyState({ query, onAsk }: { query: string; onAsk: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-subtle text-content-tertiary">
        <Search className="h-7 w-7" />
      </span>
      <p className="font-semibold">Không tìm thấy {query ? `“${query}”` : 'cây phù hợp'}</p>
      <p className="max-w-xs text-sm text-content-tertiary">
        Thử từ khoá khác, hoặc để trợ lý AI tư vấn trực tiếp cho bạn.
      </p>
      <button onClick={onAsk} className="btn btn-primary h-11 px-5 text-sm">
        <Sparkles className="h-4 w-4" /> Hỏi AI về {query ? `“${query}”` : 'cây này'}
      </button>
    </div>
  );
}

/** Bottom-sheet dialog shell (mobile-first, centers on desktop). */
function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="anim-fade-up relative max-h-[92vh] w-full max-w-lg overflow-hidden rounded-t-3xl bg-surface shadow-lg sm:rounded-3xl">
        {children}
      </div>
    </div>
  );
}

function PlantSheet({ plant, onClose }: { plant: Plant; onClose: () => void }) {
  const [chat, setChat] = useState(false);
  return (
    <Sheet onClose={onClose}>
      <div className="max-h-[92vh] overflow-y-auto">
        {/* Photo banner header */}
        <div className="relative h-48 overflow-hidden">
          <PlantImage plant={plant} className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <h2 className="text-2xl font-bold leading-tight drop-shadow-sm">{plant.name}</h2>
            <p className="text-sm italic text-white/85">{plant.scientific}</p>
            <span
              className={cn(
                'mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur',
                plant.petSafe ? 'bg-brand-500/90 text-white' : 'bg-amber-500/90 text-white',
              )}
            >
              {plant.petSafe ? <ShieldCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {plant.petSafe ? 'An toàn thú cưng' : 'Không hợp thú cưng'}
            </span>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <p className="text-sm leading-relaxed text-content-secondary">{plant.blurb}</p>

          {/* Care grid */}
          <div className="grid grid-cols-2 gap-3">
            <CareStat icon={Sun} label="Ánh sáng" value={plant.light} />
            <CareStat icon={Droplet} label="Tưới nước" value={plant.water} />
            <CareStat icon={Sprout} label="Độ khó" value={plant.level} />
            <CareStat icon={Sparkles} label="Độ ẩm" value={plant.humidity} />
          </div>

          {/* Tips */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Mẹo chăm sóc</h3>
            <ul className="space-y-2">
              {plant.tips.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm text-content-secondary">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {chat ? (
            <ChatPanel
              storageKey={`chat:plant:${plant.id}`}
              plantName={plant.name}
              intro={`Hỏi bất cứ điều gì về ${plant.name} (${plant.scientific}) — tưới nước, ánh sáng, sâu bệnh…`}
              seedQuestions={[
                `${plant.name} bao lâu tưới một lần?`,
                `Vì sao lá ${plant.name} bị vàng?`,
                `${plant.name} hợp đặt ở đâu trong nhà?`,
              ]}
              heightClass="max-h-[46vh]"
            />
          ) : (
            <button onClick={() => setChat(true)} className="btn btn-primary w-full text-sm">
              <Sparkles className="h-4 w-4" /> Hỏi trợ lý AI về {plant.name}
            </button>
          )}

          <p className="rounded-md bg-subtle px-3 py-2 text-[11px] leading-snug text-content-tertiary">
            {AI_DISCLAIMER}
          </p>
        </div>
      </div>
    </Sheet>
  );
}

function CareStat({ icon: Icon, label, value }: { icon: typeof Sun; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-subtle/40 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-content-tertiary">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function AskAISheet({ query, onClose }: { query: string; onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <p className="font-semibold">Trợ lý cây trồng AI</p>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-9 w-9 items-center justify-center rounded-full text-content-tertiary hover:bg-subtle"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-4">
        <ChatPanel
          storageKey="chat:search-ai"
          intro="Mô tả loài cây hoặc vấn đề bạn gặp — mình sẽ tư vấn cách chăm sóc phù hợp."
          seedQuestions={
            query
              ? [`${query} chăm sóc thế nào?`, `${query} có dễ trồng không?`]
              : ['Cây nào dễ chăm cho người mới?', 'Cây nào lọc không khí tốt?', 'Cây nào hợp bàn làm việc?']
          }
          heightClass="max-h-[52vh]"
        />
      </div>
    </Sheet>
  );
}
