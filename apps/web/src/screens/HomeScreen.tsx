import { Link } from 'react-router-dom';
import { Bell, Scan, Sprout, Users } from '@/components/icons';
import { AI_DISCLAIMER } from '@canopy/shared';

const QUICK_ACTIONS = [
  {
    to: '/scan?mode=identify',
    icon: Scan,
    title: 'Nhận diện cây',
    desc: 'Chụp ảnh để biết loài & cách chăm.',
    tint: 'bg-brand-100 text-brand-700',
  },
  {
    to: '/scan?mode=diagnose',
    icon: Sprout,
    title: 'Chẩn đoán bệnh',
    desc: 'Chụp lá bệnh để được AI tư vấn.',
    tint: 'bg-amber-100 text-accent',
  },
  {
    to: '/plants',
    icon: Sprout,
    title: 'Vườn của tôi',
    desc: 'Quản lý hồ sơ & sức khỏe cây.',
    tint: 'bg-brand-100 text-brand-700',
  },
  {
    to: '/community',
    icon: Users,
    title: 'Cộng đồng',
    desc: 'Mua bán cây & dịch vụ chăm sóc.',
    tint: 'bg-subtle text-content-secondary',
  },
];

export function HomeScreen() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-content-secondary">Chào buổi sáng 🌤️</p>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Hôm nay vườn cây thế nào?</h1>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <section className="grid grid-cols-2 gap-3 sm:gap-4">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  className="card flex flex-col gap-2 p-4 transition-shadow hover:shadow-md active:scale-[0.98]"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${a.tint}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="font-semibold">{a.title}</span>
                  <span className="text-xs text-content-tertiary">{a.desc}</span>
                </Link>
              );
            })}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-content-secondary">Việc chăm sóc hôm nay</h2>
            <div className="card flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-content-tertiary">
              <Bell className="h-6 w-6 text-content-tertiary" />
              Chưa có lịch nào tới hạn. Thêm cây để bắt đầu nhắc lịch.
            </div>
          </section>
        </div>

        {/* Side column */}
        <aside className="space-y-4">
          <div className="card space-y-2 p-5">
            <h2 className="text-sm font-semibold">Mẹo chăm cây</h2>
            <p className="text-sm text-content-secondary">
              Tưới khi lớp đất mặt khô ~2cm. Đa số cây trong nhà thích ánh sáng gián tiếp và sợ úng
              nước hơn thiếu nước.
            </p>
          </div>
          <p className="rounded-md bg-subtle px-3 py-2 text-[11px] leading-snug text-content-tertiary">
            {AI_DISCLAIMER}
          </p>
        </aside>
      </div>
    </div>
  );
}
