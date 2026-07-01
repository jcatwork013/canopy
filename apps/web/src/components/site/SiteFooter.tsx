import { Link } from 'react-router-dom';
import { LeafMark } from '@/components/illustrations';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border-subtle bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <LeafMark className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">Canopy</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-content-secondary">
            Nhận diện cây, chẩn đoán bệnh và nhắc lịch chăm sóc bằng AI — đồng hành cùng khu vườn của
            bạn.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Tính năng</h3>
          <ul className="mt-3 space-y-2 text-sm text-content-secondary">
            <li>
              <Link to="/scan?mode=identify" className="hover:text-content">
                Nhận diện cây
              </Link>
            </li>
            <li>
              <Link to="/scan?mode=diagnose" className="hover:text-content">
                Chẩn đoán bệnh
              </Link>
            </li>
            <li>
              <Link to="/plants" className="hover:text-content">
                Vườn của tôi
              </Link>
            </li>
            <li>
              <Link to="/community" className="hover:text-content">
                Cộng đồng
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Tài khoản</h3>
          <ul className="mt-3 space-y-2 text-sm text-content-secondary">
            <li>
              <Link to="/login" className="hover:text-content">
                Đăng nhập
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-content">
                Đăng ký
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border-subtle">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-content-tertiary sm:px-6 lg:px-8">
          © {year} Canopy · Chăm cây cùng AI
        </p>
      </div>
    </footer>
  );
}
