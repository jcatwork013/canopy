import { Link, useParams } from 'react-router-dom';
import { MapPin, Phone, Sprout, Users } from '@/components/icons';
import { Badge, Card, CardContent, cn } from '@/components/ui';
import { getListing, getService } from '@/features/community/data';
import { useSiteConfig } from '@/features/site/useSiteConfig';

export function ServiceDetailScreen() {
  const { id } = useParams();
  const { contactPhone } = useSiteConfig();
  const svc = id ? getService(id) : undefined;

  if (!svc) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-semibold">Không tìm thấy dịch vụ</p>
        <Link to="/community" className="mt-3 inline-block text-brand-600 hover:underline">
          ← Về cộng đồng
        </Link>
      </div>
    );
  }

  const products = svc.products.map(getListing).filter(Boolean);
  const phone = contactPhone || svc.phone;
  const mapEmbed = `https://maps.google.com/maps?q=${svc.lat},${svc.lng}&z=15&output=embed`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${svc.lat},${svc.lng}`;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link to="/community" className="text-sm text-content-secondary hover:text-content">
        ← Cộng đồng
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Media + map */}
        <div className="space-y-4">
          <img
            src={svc.image}
            alt={svc.name}
            className="aspect-video w-full rounded-2xl object-cover"
          />
          <div className="overflow-hidden rounded-2xl border border-border-subtle">
            <iframe
              title="Bản đồ"
              src={mapEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-64 w-full border-0"
            />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  svc.type === 'repair' ? 'bg-brand-100 text-brand-700' : 'bg-amber-100 text-accent',
                )}
              >
                {svc.type === 'repair' ? <Users className="h-5 w-5" /> : <Sprout className="h-5 w-5" />}
              </span>
              <h1 className="text-2xl font-bold tracking-tight">{svc.name}</h1>
            </div>
            <Badge className="mt-2" variant={svc.type === 'repair' ? 'brand' : 'warning'}>
              {svc.type === 'repair' ? 'Thợ chăm cây' : 'Trại / vườn cây'}
            </Badge>
          </div>

          <p className="text-content-secondary">{svc.desc}</p>

          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-content-tertiary" />
                <span>{svc.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 shrink-0 text-content-tertiary" />
                <a href={`tel:${phone}`} className="font-medium text-brand-700 hover:underline">
                  {phone}
                </a>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row">
            <a href={`tel:${phone}`} className="btn btn-primary flex-1 text-base">
              <Phone className="h-5 w-5" />
              Gọi ngay
            </a>
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              className="btn flex-1 border border-border-strong bg-surface text-base hover:bg-subtle"
            >
              <MapPin className="h-5 w-5" />
              Chỉ đường
            </a>
          </div>
        </div>
      </div>

      {/* Products the store sells */}
      {products.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight">Cây đang bán tại đây</h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map(
              (p) =>
                p && (
                  <Link key={p.id} to={`/community/${p.id}`} className="card lift overflow-hidden">
                    <div className="aspect-square w-full overflow-hidden bg-subtle">
                      <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                    </div>
                    <div className="space-y-0.5 p-3">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-xs italic text-content-tertiary">{p.sci}</p>
                    </div>
                  </Link>
                ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}
