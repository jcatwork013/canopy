import type { ComponentType, SVGProps } from 'react';
import { BookOpen, Home, Leaf, Scan, Search, Sprout, User, Users } from '@/components/icons';

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Center, raised primary action in the mobile tab bar. */
  primary?: boolean;
  /** Exact-match active state (for '/'). */
  end?: boolean;
}

/** Primary app navigation — shared by the mobile tab bar and desktop sidebar. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Trang chủ', icon: Home, end: true },
  { to: '/search', label: 'Tra cứu', icon: Search },
  { to: '/plants', label: 'Khu vườn', icon: Sprout },
  { to: '/scan', label: 'Trợ lý chăm sóc cây', icon: Scan, primary: true },
  { to: '/care', label: 'Chăm sóc', icon: Leaf },
  { to: '/community', label: 'Khám phá', icon: Users },
  { to: '/guides', label: 'Cẩm nang', icon: BookOpen },
  { to: '/profile', label: 'Tôi', icon: User },
];
