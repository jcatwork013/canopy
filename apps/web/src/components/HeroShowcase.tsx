import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scan, ShieldCheck, Sparkles } from '@/components/icons';
import { cn } from '@/components/ui';
import { useSiteConfig } from '@/features/site/useSiteConfig';
import { useAuthStore } from '@/store/auth';

export function HeroShowcase() {
  const { heroImages: IMAGES, tagline } = useSiteConfig();
  const user = useAuthStore((s) => s.user);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (IMAGES.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % IMAGES.length), 5000);
    return () => clearInterval(t);
  }, [IMAGES.length]);

  return (
    <section className="relative isolate min-h-[560px] overflow-hidden lg:min-h-[680px]">
      {/* Slides with slow Ken-Burns zoom on the active one */}
      {IMAGES.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt="Cây xanh"
          loading={idx === 0 ? 'eager' : 'lazy'}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-all ease-out',
            idx === i ? 'scale-105 opacity-100 duration-[5000ms]' : 'scale-100 opacity-0 duration-1000',
          )}
        />
      ))}

      {/* Contrast overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />

      {/* Content */}
      <div className="relative mx-auto flex min-h-[560px] max-w-6xl flex-col justify-center px-4 py-20 text-white sm:px-6 lg:min-h-[680px] lg:px-8">
        <span className="anim-fade-up inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" />
          Trợ lý làm vườn bằng AI
        </span>
        <h1
          className="anim-fade-up mt-5 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight drop-shadow-sm sm:text-5xl lg:text-6xl"
          style={{ animationDelay: '0.08s' }}
        >
          Chăm cây thông minh hơn cùng <span className="text-brand-300">Canopy</span>
        </h1>
        <p
          className="anim-fade-up mt-5 max-w-lg text-base text-white/85 lg:text-lg"
          style={{ animationDelay: '0.16s' }}
        >
          {tagline ||
            'Nhận diện cây, chẩn đoán bệnh và nhắc lịch chăm sóc — chỉ từ một tấm ảnh. Vườn của bạn, khỏe mạnh quanh năm.'}
        </p>
        <div className="anim-fade-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: '0.24s' }}>
          <Link to="/scan?mode=identify" className="btn btn-primary px-6 text-base">
            <Scan className="h-5 w-5" />
            Quét cây ngay
          </Link>
          {!user && (
            <Link
              to="/register"
              className="btn border-2 border-brand-500 bg-white px-6 text-base font-semibold text-brand-700 hover:bg-brand-50"
            >
              Tạo tài khoản
            </Link>
          )}
        </div>
        <div
          className="anim-fade-up mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/75"
          style={{ animationDelay: '0.32s' }}
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-brand-300" /> Xác minh email bảo mật
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-brand-300" /> Miễn phí bắt đầu
          </span>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {IMAGES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Ảnh ${idx + 1}`}
            className={cn(
              'h-1.5 rounded-full bg-white transition-all',
              idx === i ? 'w-7' : 'w-2 opacity-50 hover:opacity-80',
            )}
          />
        ))}
      </div>
    </section>
  );
}
