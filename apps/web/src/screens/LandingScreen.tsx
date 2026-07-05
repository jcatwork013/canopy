import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Leaf, Scan, Search, Sparkles, Sprout, Users } from '@/components/icons';
import { HeroShowcase } from '@/components/HeroShowcase';
import { PLANTS } from '@/features/search/plantCatalog';

const FEATURES = [
  {
    icon: Scan,
    title: 'Nhận diện tức thì',
    desc: 'Chụp một tấm ảnh, AI cho biết loài cây, tên thường gọi và cách chăm phù hợp.',
  },
  {
    icon: Sprout,
    title: 'Chẩn đoán bệnh',
    desc: 'Phát hiện sâu bệnh qua ảnh lá, kèm nguyên nhân và việc cần làm ngay.',
  },
  {
    icon: Bell,
    title: 'Nhắc lịch chăm sóc',
    desc: 'Lịch tưới nước, bón phân theo từng loài — không còn quên cây.',
  },
  {
    icon: Users,
    title: 'Cộng đồng & chợ cây',
    desc: 'Mua bán cây và kết nối dịch vụ chăm sóc quanh bạn.',
  },
];

const STEPS = [
  { n: '01', title: 'Chụp ảnh', desc: 'Chụp cây hoặc vùng lá bị bệnh.' },
  { n: '02', title: 'AI phân tích', desc: 'Nhận diện loài hoặc chẩn đoán bệnh trong vài giây.' },
  { n: '03', title: 'Chăm đúng cách', desc: 'Nhận lộ trình chăm sóc và nhắc lịch tự động.' },
];

const STATS = [
  { value: `${PLANTS.length}+`, label: 'Loài cây tra cứu' },
  { value: '~3 giây', label: 'Nhận diện bằng AI' },
  { value: '24/7', label: 'Trợ lý chăm cây' },
];

// A few well-known plants to seed the search band.
const POPULAR = PLANTS.slice(0, 6);

/** Consistent section eyebrow + heading. */
function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-content-secondary">{sub}</p>}
    </div>
  );
}

export function LandingScreen() {
  return (
    <div className="overflow-hidden">
      <HeroShowcase />

      {/* ── Stats strip — brand band bridging hero and content ────────────── */}
      <section className="border-b border-border-subtle bg-brand-600 text-white">
        <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x divide-white/15 px-4 py-6 sm:px-6 lg:py-8">
          {STATS.map((s) => (
            <div key={s.label} className="px-2 text-center">
              <p className="text-2xl font-extrabold sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs text-brand-50 sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Search band — base background, surfaces the plant library ─────── */}
      <section className="bg-base">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-24">
          <SectionHead
            eyebrow="Thư viện cây"
            title={<>Tra cứu <span className="text-gradient">mọi loài cây</span></>}
            sub="Tìm theo tên, đặc điểm hay nhu cầu chăm sóc — kèm hồ sơ chi tiết và hỏi đáp cùng AI."
          />

          <Link
            to="/search"
            className="mx-auto mt-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-2 pl-5 shadow-md transition-shadow hover:shadow-lg"
          >
            <Search className="h-5 w-5 shrink-0 text-content-tertiary" />
            <span className="flex-1 text-content-tertiary">Trầu bà, lưỡi hổ, cây lọc không khí…</span>
            <span className="btn btn-primary h-11 shrink-0 px-5 text-sm">
              Tìm cây
            </span>
          </Link>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {POPULAR.map((p) => (
              <Link
                key={p.id}
                to="/search"
                className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface py-1 pl-1 pr-3.5 text-sm font-medium text-content-secondary transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                <img
                  src={`/plants/${p.id}.jpg`}
                  alt=""
                  loading="lazy"
                  className="h-7 w-7 rounded-full object-cover"
                />
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features — surface (white) background, clean light cards ──────── */}
      <section className="border-y border-border-subtle bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHead
            eyebrow="Tính năng"
            title={<>Mọi thứ để chăm cây <span className="text-gradient">tốt hơn</span></>}
            sub="Bộ công cụ AI giúp bạn hiểu và chăm sóc từng chiếc lá."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="lift group rounded-2xl border border-border-subtle bg-base p-6"
                >
                  <span className="icon-tile flex h-12 w-12 items-center justify-center rounded-2xl">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-content-secondary">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works — subtle background for clear separation ─────────── */}
      <section className="bg-subtle">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <SectionHead eyebrow="Quy trình" title="Chỉ 3 bước đơn giản" />

          <div className="relative mt-14 grid gap-10 sm:grid-cols-3">
            <span className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-transparent via-brand-400 to-transparent sm:block" />
            {STEPS.map((s) => (
              <div key={s.n} className="relative text-center">
                <span className="icon-tile mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-extrabold ring-4 ring-base">
                  {s.n}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-content-secondary">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA — brand gradient, the strong closing note ────────────────── */}
      <section className="bg-base px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div
          className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-14 text-center text-white lg:py-20"
          style={{ backgroundImage: 'var(--grad-brand)' }}
        >
          <span className="anim-blob pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
          <span
            className="anim-blob pointer-events-none absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-black/10 blur-2xl"
            style={{ animationDelay: '5s' }}
          />
          <span className="relative inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Leaf className="h-3.5 w-3.5" /> Miễn phí bắt đầu
          </span>
          <h2 className="relative mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
            Sẵn sàng chăm cây cùng AI?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-brand-50">
            Tạo tài khoản miễn phí và bắt đầu quét cây đầu tiên của bạn.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="btn bg-white px-6 text-base font-semibold text-brand-700 hover:opacity-90"
            >
              Bắt đầu miễn phí
            </Link>
            <Link
              to="/scan"
              className="btn border border-white/50 px-6 text-base text-white hover:bg-white/10"
            >
              Thử quét ngay <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
