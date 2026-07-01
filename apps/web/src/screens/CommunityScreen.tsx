import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Sprout, Users } from '@/components/icons';
import { Badge, Button, cn } from '@/components/ui';
import {
  LISTINGS,
  PLANT_CATEGORIES,
  SERVICES,
  distanceKm,
  listingCategory,
  type Service,
} from '@/features/community/data';

const TABS = [
  { key: 'plants', label: 'Chợ cây' },
  { key: 'services', label: 'Dịch vụ gần bạn' },
] as const;

export function CommunityScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('plants');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Cộng đồng</h1>
        <p className="mt-1 text-content-secondary">Mua bán cây và tìm dịch vụ chăm sóc quanh bạn.</p>
      </div>

      <div className="inline-flex rounded-xl border border-border-subtle bg-subtle p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              tab === t.key ? 'bg-surface text-content shadow-sm' : 'text-content-secondary hover:text-content',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plants' ? <Marketplace /> : <Services />}
    </div>
  );
}

function Marketplace() {
  const [cat, setCat] = useState<string>('all');
  const items = cat === 'all' ? LISTINGS : LISTINGS.filter((l) => listingCategory(l.id) === cat);

  return (
    <div className="space-y-5">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {PLANT_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              cat === c.key
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-border-subtle text-content-secondary hover:border-border-strong hover:text-content',
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="card p-8 text-center text-sm text-content-tertiary">
          Chưa có cây trong danh mục này.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
        <Link
          key={l.id}
          to={`/community/${l.id}`}
          className="card lift overflow-hidden"
        >
          <div className="aspect-[4/3] w-full overflow-hidden bg-subtle">
            <img src={l.image} alt={l.name} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div className="space-y-1.5 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight">{l.name}</h3>
              <Badge variant="brand">Liên hệ</Badge>
            </div>
            <p className="text-xs italic text-content-tertiary">{l.sci}</p>
            <p className="flex items-center gap-1 text-xs text-content-secondary">
              <MapPin className="h-3.5 w-3.5" />
              {l.location}
            </p>
          </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const GEO_KEY = 'canopy-geo';

function Services() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [asking, setAsking] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');

  // Apply a cached location instantly (works for anyone, no login needed).
  useEffect(() => {
    try {
      const c = localStorage.getItem(GEO_KEY);
      if (c) setCoords(JSON.parse(c));
    } catch {
      /* ignore */
    }
  }, []);

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoMsg('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    setAsking(true);
    setGeoMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        try {
          localStorage.setItem(GEO_KEY, JSON.stringify(c));
        } catch {
          /* ignore */
        }
        setAsking(false);
      },
      (err) => {
        setAsking(false);
        // Distinguish a real denial from timeout / position-unavailable.
        if (err.code === err.PERMISSION_DENIED) {
          setGeoMsg('Bạn đã từ chối quyền vị trí — vẫn xem được danh sách bên dưới.');
        } else {
          setGeoMsg('Chưa lấy được vị trí (thiết bị/mạng). Thử lại hoặc xem danh sách bên dưới.');
        }
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 },
    );
  };

  const RADIUS_KM = 80;
  const ranked = coords
    ? [...SERVICES].map((s) => ({ ...s, km: distanceKm(coords, s) })).sort((a, b) => a.km! - b.km!)
    : SERVICES.map((s) => ({ ...s, km: undefined as number | undefined }));
  const nearby = coords ? ranked.filter((s) => (s.km ?? 999) <= RADIUS_KM) : ranked;
  const noneNearby = coords && nearby.length === 0;
  const list = noneNearby ? ranked.slice(0, 3) : nearby;

  return (
    <div className="space-y-5">
      {/* Location prompt / state */}
      {!coords ? (
        <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
          <span className="icon-tile flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
            <MapPin className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <p className="font-semibold">Tìm dịch vụ gần bạn</p>
            <p className="text-sm text-content-secondary">
              Cho phép vị trí để gợi ý thợ chăm cây & trại cây gần nhất, tiết kiệm thời gian và chi
              phí đi lại. Vị trí chỉ dùng để lọc & sắp xếp kết quả.
            </p>
            {geoMsg && <p className="mt-1 text-xs text-content-tertiary">{geoMsg}</p>}
          </div>
          <Button onClick={requestLocation} disabled={asking}>
            <MapPin className="h-5 w-5" />
            {asking ? 'Đang lấy vị trí…' : 'Cho phép vị trí'}
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-sm text-content-secondary">
          <MapPin className="h-4 w-4 text-brand-600" />
          {noneNearby
            ? `Không có dịch vụ trong ${RADIUS_KM}km — đây là những nơi gần bạn nhất:`
            : `Hiển thị ${list.length} dịch vụ trong vòng ${RADIUS_KM}km quanh bạn.`}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((s) => (
          <ServiceCard key={s.id} s={s} km={s.km} />
        ))}
      </div>

      <p className="rounded-md bg-subtle px-3 py-2 text-[11px] leading-snug text-content-tertiary">
        Danh sách dịch vụ hiện là dữ liệu mẫu. Bản kết nối tìm kiếm thực tế (Google) quanh bạn sẽ sớm
        có.
      </p>
    </div>
  );
}

function ServiceCard({ s, km }: { s: Service; km?: number }) {
  return (
    <Link to={`/community/service/${s.id}`} className="card lift flex items-start gap-3 p-4">
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          s.type === 'repair' ? 'bg-brand-100 text-brand-700' : 'bg-amber-100 text-accent',
        )}
      >
        {s.type === 'repair' ? <Users className="h-6 w-6" /> : <Sprout className="h-6 w-6" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold leading-tight">{s.name}</h3>
          {km !== undefined && <Badge variant="muted">{km} km</Badge>}
        </div>
        <p className="line-clamp-1 text-sm text-content-secondary">{s.desc}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-content-tertiary">
          <MapPin className="h-3.5 w-3.5" />
          {s.area}
          {s.products.length > 0 && <span>· {s.products.length} cây đang bán</span>}
        </p>
      </div>
      <a
        href={`tel:${s.phone}`}
        onClick={(e) => e.stopPropagation()}
        className="btn btn-primary h-9 shrink-0 px-3 text-sm"
      >
        <Phone className="h-4 w-4" />
        Gọi
      </a>
    </Link>
  );
}
