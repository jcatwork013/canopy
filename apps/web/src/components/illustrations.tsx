import type { SVGProps } from 'react';

/**
 * Hand-drawn-style spot illustrations (inline SVG, brand palette). They use
 * semi-transparent brand tones so they sit well on light or dark surfaces.
 */
type Props = SVGProps<SVGSVGElement>;

/** Potted plant — hero / landing. */
export function HeroPlant(p: Props) {
  return (
    <svg viewBox="0 0 280 240" fill="none" xmlns="http://www.w3.org/2000/svg" {...p}>
      {/* soft backdrop */}
      <circle cx="150" cy="110" r="96" fill="#22c55e" opacity="0.10" />
      <circle cx="64" cy="58" r="20" fill="#f59e0b" opacity="0.18" />
      {/* leaves */}
      <g stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M140 150c0-46-26-78-70-86 6 46 30 74 70 86Z" fill="#86efac" />
        <path d="M140 150c0-52 28-86 76-92-4 50-32 80-76 92Z" fill="#4ade80" />
        <path d="M140 150c-2-34 8-64 34-84-2 36-14 64-34 84Z" fill="#22c55e" opacity="0.9" />
        <path d="M140 150V96" />
        <path d="M140 150c-18-10-32-24-40-44M140 150c20-12 34-28 44-50" />
      </g>
      {/* pot */}
      <path d="M96 150h88l-10 56a8 8 0 0 1-8 7h-44a8 8 0 0 1-8-7l-10-56Z" fill="#d97706" />
      <rect x="90" y="142" width="100" height="16" rx="8" fill="#b45309" />
      <path d="M112 168l6 40M168 168l-6 40" stroke="#92400e" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** Canopy logo mark — gradient tile with a crafted leaf. */
export function LeafMark(p: Props) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...p}>
      <defs>
        <linearGradient id="canopyMark" x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d36b" />
          <stop offset="0.55" stopColor="#16a34a" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#canopyMark)" />
      {/* top sheen */}
      <path d="M0 14C0 6.27 6.27 0 14 0h20c7.73 0 14 6.27 14 14v6H0Z" fill="#fff" opacity="0.1" />
      {/* leaf body */}
      <path
        d="M24.5 37.5c-7.2 0-12.2-5-12.2-12.3 0-9.4 8.3-14.7 24.4-14.7 0 16.5-5 27-12.2 27Z"
        fill="#fff"
        opacity="0.96"
      />
      {/* midrib + veins */}
      <path
        d="M24.5 37.5c-.4-12.6 3-20 11-24.4"
        stroke="#15803d"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M21 30.5c2.4-2.9 5.4-4.9 9-6M20.5 24c3-2.8 6.2-4.2 10-5"
        stroke="#22c55e"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

/** Empty garden — seedling in soil, for empty states. */
export function EmptyPlant(p: Props) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" {...p}>
      <ellipse cx="100" cy="132" rx="70" ry="12" fill="#16a34a" opacity="0.08" />
      <g stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M100 124V80" />
        <path d="M100 96c0-16-12-26-32-26 0 16 12 26 32 26Z" fill="#86efac" />
        <path d="M100 88c0-16 12-26 30-26 0 16-12 26-30 26Z" fill="#4ade80" />
      </g>
      <path d="M74 124h52l-5 18a5 5 0 0 1-5 4H84a5 5 0 0 1-5-4l-5-18Z" fill="#d97706" />
      <rect x="70" y="118" width="60" height="10" rx="5" fill="#b45309" />
    </svg>
  );
}

/** Diagnose — leaf inside a lens, for the scan/diagnose flows. */
export function ScanLeaf(p: Props) {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" {...p}>
      <circle cx="86" cy="78" r="52" fill="#22c55e" opacity="0.10" />
      <g stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M86 104A26 26 0 0 1 60 78C60 60 74 50 112 50c0 30-12 54-26 54Z" fill="#4ade80" />
        <path d="M60 104c12-18 22-28 38-32" />
      </g>
      <circle cx="86" cy="78" r="44" stroke="#16a34a" strokeWidth="4" opacity="0.5" />
      <path d="M120 112l26 26" stroke="#16a34a" strokeWidth="7" strokeLinecap="round" />
      {/* corner brackets */}
      <g stroke="#16a34a" strokeWidth="3" strokeLinecap="round" opacity="0.7">
        <path d="M44 44h-8v8M128 44h8v8M44 112h-8v-8M128 112h8v-8" />
      </g>
    </svg>
  );
}
