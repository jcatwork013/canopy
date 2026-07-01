import { Link } from 'react-router-dom';
import { Bell, Scan, Sparkles, Sprout, Users } from '@/components/icons';
import { HeroShowcase } from '@/components/HeroShowcase';

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

export function LandingScreen() {
  return (
    <div className="overflow-hidden">
      <HeroShowcase />

      {/* Features + How it works — dark, dramatic band */}
      <section className="relative isolate overflow-hidden bg-[#08120c] text-white">
        {/* ambient glows + grid texture */}
        <span className="anim-blob pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-brand-500/20 blur-[100px]" />
        <span className="anim-blob pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-emerald-400/15 blur-[110px]" style={{ animationDelay: '4s' }} />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-300 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Tính năng
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Mọi thứ để chăm cây <span className="text-gradient-light">tốt hơn</span>
            </h2>
            <p className="mt-3 text-white/55">Bộ công cụ AI giúp bạn hiểu và chăm sóc từng chiếc lá.</p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group anim-fade-up relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-all duration-200 hover:-translate-y-1.5 hover:border-brand-400/40 hover:bg-white/[0.06]"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <span className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-500/0 blur-2xl transition-all duration-300 group-hover:bg-brand-500/25" />
                  <span className="icon-tile relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_8px_24px_rgba(34,197,94,0.45)]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-white/55">{f.desc}</p>
                </div>
              );
            })}
          </div>

          {/* How it works */}
          <div className="mt-24 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Cách hoạt động</h2>
          </div>
          <div className="relative mt-14 grid gap-10 sm:grid-cols-3">
            <span className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent sm:block" />
            {STEPS.map((s, idx) => (
              <div
                key={s.n}
                className="anim-fade-up relative text-center"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <span className="icon-tile mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-extrabold shadow-[0_10px_30px_rgba(34,197,94,0.5)] ring-4 ring-white/5">
                  {s.n}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-white/55">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div
          className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-14 text-center text-white lg:py-20"
          style={{ backgroundImage: 'var(--grad-brand)' }}
        >
          <span className="anim-blob pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
          <span
            className="anim-blob pointer-events-none absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-black/10 blur-2xl"
            style={{ animationDelay: '5s' }}
          />
          <h2 className="relative text-3xl font-bold tracking-tight lg:text-4xl">
            Sẵn sàng chăm cây cùng AI?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-brand-50">
            Tạo tài khoản miễn phí và bắt đầu quét cây đầu tiên của bạn.
          </p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
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
              Thử quét ngay
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
