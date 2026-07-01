import type { SVGProps } from 'react';

// Lightweight inline icon set (no dependency). Stroke inherits currentColor.
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

export const Leaf = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M11 20A7 7 0 0 1 4 13C4 8 8 4 20 4c0 12-4 16-9 16Z" />
    <path d="M4 20c3-5 6-8 10-9" />
  </svg>
);

export const Store = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 9.5 5.2 4.5A1 1 0 0 1 6.2 4h11.6a1 1 0 0 1 1 .8L20 9.5" />
    <path d="M4 9.5h16a0 0 0 0 1 0 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0Z" />
    <path d="M5 12.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7.5" />
    <path d="M9.5 21v-4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V21" />
  </svg>
);

export const Home = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
  </svg>
);

export const Sprout = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 21v-7" />
    <path d="M12 14c0-3-2-5-6-5 0 3 2 5 6 5Z" />
    <path d="M12 12c0-3 2-5 6-5 0 3-2 5-6 5Z" />
  </svg>
);

export const Scan = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);

export const Users = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
    <path d="M16 6a3 3 0 0 1 0 6M17 15c2 0 4 2 4 5" />
  </svg>
);

export const User = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);

export const Bell = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 7 2 7H4s2-2 2-7Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);

export const Settings = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.6H9.4l-.3 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.6h5.2l.3-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.6.1-1Z" />
  </svg>
);

export const Mail = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const Lock = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </svg>
);

export const Eye = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOff = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
    <path d="M9.4 5.8A9.3 9.3 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.4 3.2M6.3 6.9A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 3.1-.5" />
  </svg>
);

export const ArrowRight = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const LayoutDashboard = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

export const Sparkles = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" />
    <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
  </svg>
);

export const Database = (p: IconProps) => (
  <svg {...base} {...p}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
    <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
);

export const Activity = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 12h4l3 8 4-16 3 8h4" />
  </svg>
);

export const Menu = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const Check = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m5 12 5 5L20 6" />
  </svg>
);

export const X = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const LogOut = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
    <path d="M10 17l-5-5 5-5" />
    <path d="M5 12h12" />
  </svg>
);

export const RefreshCw = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 4v4h-4M3 20v-4h4" />
  </svg>
);

export const Pencil = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="M13.5 6.5l4 4" />
  </svg>
);

export const Droplet = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10Z" />
  </svg>
);

export const BookOpen = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 6.5C10.5 5 8 4.5 3 4.5v13c5 0 7.5.5 9 2 1.5-1.5 4-2 9-2v-13c-5 0-7.5.5-9 2Z" />
    <path d="M12 6.5v13" />
  </svg>
);

export const ImagePlus = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
    <path d="m4 16 4-4a2 2 0 0 1 2.7-.1l3.3 2.9" />
    <circle cx="9" cy="9" r="1.5" />
    <path d="M18 15v6M15 18h6" />
  </svg>
);

export const Globe = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 3.8 5.8 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.8-3.8-9S9.5 5.5 12 3Z" />
  </svg>
);

export const AlertTriangle = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const Phone = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6.2 2 2 0 0 1 5 4Z" />
  </svg>
);

export const MapPin = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-6.3 7-11a7 7 0 0 0-14 0c0 4.7 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const Camera = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </svg>
);

export const Upload = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const Sun = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const Moon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

export const Monitor = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);

export const Search = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const ShieldCheck = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const Spinner = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);
