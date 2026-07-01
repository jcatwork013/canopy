import type { ComponentType, SVGProps } from 'react';
import {
  Activity,
  Database,
  Globe,
  LayoutDashboard,
  Leaf,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
} from '@/components/icons';
import { cn } from '@/components/ui';

export type SectionKey = 'overview' | 'kyc' | 'ai' | 'website' | 'email' | 'storage';

interface NavItem {
  key: SectionKey;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'kyc', label: 'Duyệt KYC', icon: ShieldCheck },
  { key: 'ai', label: 'AI Provider', icon: Sparkles },
  { key: 'website', label: 'Trang web', icon: Globe },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'storage', label: 'Lưu trữ', icon: Database },
];

export const SECTION_META: Record<SectionKey, { title: string; description: string }> = {
  overview: {
    title: 'Tổng quan hệ thống',
    description: 'Trạng thái sẵn sàng và các tích hợp bắt buộc của Canopy.',
  },
  kyc: {
    title: 'Duyệt xác thực (KYC)',
    description: 'Xét duyệt hồ sơ người bán & người chăm sóc cây, cấp vai trò.',
  },
  ai: {
    title: 'Cấu hình AI',
    description: 'Kết nối Gemini hoặc OpenAI, kiểm tra key và chọn model.',
  },
  website: {
    title: 'Trang web ngoài',
    description: 'Slogan, ảnh slider hero và số liên hệ trên trang công khai.',
  },
  email: {
    title: 'Cấu hình Email',
    description: 'Gửi email xác minh, đặt lại mật khẩu và thông báo qua Resend.',
  },
  storage: {
    title: 'Cấu hình lưu trữ',
    description: 'Lưu ảnh cây và tệp tải lên qua MinIO.',
  },
};

interface SidebarProps {
  active: SectionKey;
  onSelect: (key: SectionKey) => void;
  email?: string | null;
  onLogout: () => void;
}

export function AdminSidebar({ active, onSelect, email, onLogout }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-border-subtle px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Leaf className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-content">Canopy</p>
          <p className="text-xs text-content-tertiary">Bảng quản trị</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-content-tertiary">
          Cấu hình
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-content-secondary hover:bg-subtle hover:text-content',
              )}
            >
              <Icon className={cn('h-5 w-5', isActive ? 'text-brand-600' : 'text-content-tertiary')} />
              {item.label}
            </button>
          );
        })}
        <a
          href="/"
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-content-secondary transition-colors hover:bg-subtle hover:text-content"
        >
          <Activity className="h-5 w-5" />
          Về ứng dụng
        </a>
      </nav>

      {/* Footer */}
      <div className="border-t border-border-subtle p-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-content">{email ?? 'Quản trị viên'}</p>
            <p className="text-xs text-content-tertiary">System admin</p>
          </div>
          <button
            onClick={onLogout}
            aria-label="Đăng xuất"
            className="flex h-9 w-9 items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-subtle hover:text-danger"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
