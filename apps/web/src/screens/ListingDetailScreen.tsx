import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Check, Droplet, MapPin, Phone, ShieldCheck, Sun, Users, X } from '@/components/icons';
import { Badge, cn } from '@/components/ui';
import {
  LISTINGS,
  getListing,
  listingArticle,
  listingCategory,
  listingImages,
  PLANT_CATEGORIES,
} from '@/features/community/data';
import { useSiteConfig } from '@/features/site/useSiteConfig';

export function ListingDetailScreen() {
  const { id } = useParams();
  const { contactPhone } = useSiteConfig();
  const listing = id ? getListing(id) : undefined;

  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!listing) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-semibold">Không tìm thấy cây này</p>
        <Link to="/community" className="mt-3 inline-block text-brand-600 hover:underline">
          ← Về chợ cây
        </Link>
      </div>
    );
  }

  const images = listingImages(listing);
  const phone = contactPhone || listing.phone;
  const cat = listingCategory(listing.id);
  const catLabel = PLANT_CATEGORIES.find((c) => c.key === cat)?.label;
  const related = LISTINGS.filter((l) => l.id !== listing.id && listingCategory(l.id) === cat).slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link to="/community" className="text-sm text-content-secondary hover:text-content">
        ← Chợ cây
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <button
            onClick={() => setLightbox(active)}
            className="block w-full overflow-hidden rounded-3xl bg-subtle"
          >
            <img src={images[active]} alt={listing.name} className="aspect-square w-full object-cover" />
          </button>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={cn(
                    'h-16 w-16 overflow-hidden rounded-xl border-2 transition-colors',
                    i === active ? 'border-brand-500' : 'border-transparent opacity-70 hover:opacity-100',
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {catLabel && <Badge variant="brand">{catLabel}</Badge>}
              <Badge variant="muted">Còn hàng</Badge>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{listing.name}</h1>
            <p className="italic text-content-tertiary">{listing.sci}</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-content-secondary">
              <MapPin className="h-4 w-4" />
              {listing.location}
            </p>
          </div>

          <p className="leading-relaxed text-content-secondary">{listing.desc}</p>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Hướng dẫn chăm sóc</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <CareCard icon={<Sun className="h-5 w-5" />} tint="bg-amber-100 text-amber-600" label="Ánh sáng" value={listing.care.light} />
              <CareCard icon={<Droplet className="h-5 w-5" />} tint="bg-sky-100 text-sky-600" label="Tưới nước" value={listing.care.water} />
              <CareCard icon={<Check className="h-5 w-5" />} tint="bg-brand-100 text-brand-600" label="Lưu ý" value={listing.care.note} className="sm:col-span-2" />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border-subtle p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <Users className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <p className="flex items-center gap-1.5 font-semibold">
                {listing.seller}
                <ShieldCheck className="h-4 w-4 text-brand-600" />
              </p>
              <p className="text-xs text-content-tertiary">Người bán trên Canopy</p>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
            <a href={`tel:${phone}`} className="btn btn-primary w-full text-base">
              <Phone className="h-5 w-5" />
              Gọi ngay: {phone}
            </a>
            <p className="mt-2 text-center text-xs text-content-secondary">
              Giá thỏa thuận khi liên hệ trực tiếp với người bán.
            </p>
          </div>
        </div>
      </div>

      {/* Article */}
      <article className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">Về sản phẩm</h2>
        <div className="space-y-3 leading-relaxed text-content-secondary">
          {listingArticle(listing)
            .split('\n\n')
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight">Cây cùng loại</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <Link key={p.id} to={`/community/${p.id}`} className="card lift overflow-hidden">
                <div className="aspect-square w-full overflow-hidden bg-subtle">
                  <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="space-y-0.5 p-3">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="truncate text-xs italic text-content-tertiary">{p.sci}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox
          images={images}
          index={lightbox}
          onChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

function Lightbox({
  images,
  index,
  onChange,
  onClose,
}: {
  images: string[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const prev = () => onChange((index - 1 + images.length) % images.length);
  const next = () => onChange((index + 1) % images.length);
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button
        onClick={onClose}
        aria-label="Đóng"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-xl object-contain"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Trước"
            className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ArrowRight className="h-6 w-6 rotate-180" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Tiếp"
            className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
            {index + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
}

function CareCard({
  icon,
  tint,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-3 rounded-xl border border-border-subtle p-3', className)}>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tint)}>
        {icon}
      </span>
      <div>
        <p className="text-xs font-medium text-content-tertiary">{label}</p>
        <p className="text-sm text-content">{value}</p>
      </div>
    </div>
  );
}
