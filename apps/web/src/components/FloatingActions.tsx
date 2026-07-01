import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from '@/components/icons';
import { cn } from '@/components/ui';

/** Floating: an AI-assistant bubble (left) + a scroll-progress back-to-top (right),
 *  both fading in once the user scrolls down. */
export function FloatingActions() {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
      setShow(el.scrollTop > 320);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const R = 21;
  const C = 2 * Math.PI * R;

  return (
    <>
      {/* Assistant bubble — left */}
      <Link
        to="/scan"
        aria-label="Trợ lý chăm sóc cây"
        className={cn(
          'group fixed bottom-6 left-5 z-40 flex h-14 items-center overflow-hidden rounded-full bg-brand-600 text-white shadow-[0_10px_30px_rgba(22,163,74,0.45)] transition-all duration-300 hover:bg-brand-700',
          show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0',
        )}
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center">
          <span className="relative flex h-7 w-7 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40" />
            <Sparkles className="relative h-6 w-6" />
          </span>
        </span>
        <span className="max-w-0 whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-[220px] group-hover:pr-5">
          Trợ lý chăm sóc cây
        </span>
      </Link>

      {/* Back to top with progress ring — right */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Lên đầu trang"
        className={cn(
          'fixed bottom-6 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-content shadow-lg ring-1 ring-border-subtle transition-all duration-300 hover:bg-subtle',
          show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0',
        )}
      >
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={R} fill="none" stroke="var(--border-subtle)" strokeWidth="3" />
          <circle
            cx="24"
            cy="24"
            r={R}
            fill="none"
            stroke="#16a34a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
        <ArrowRight className="relative h-5 w-5 -rotate-90 text-brand-600" />
      </button>
    </>
  );
}
