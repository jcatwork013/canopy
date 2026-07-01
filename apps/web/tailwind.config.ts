import type { Config } from 'tailwindcss';

// Tailwind maps utility classes onto the CSS variables in src/styles/tokens.css.
// This keeps a single source of truth and lets dark mode work purely via tokens.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          200: 'var(--color-brand-200)',
          300: 'var(--color-brand-300)',
          400: 'var(--color-brand-400)',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          700: 'var(--color-brand-700)',
          800: 'var(--color-brand-800)',
          900: 'var(--color-brand-900)',
        },
        accent: 'var(--color-accent)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        success: 'var(--color-success)',
        info: 'var(--color-info)',
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        subtle: 'var(--bg-subtle)',
        input: 'var(--bg-input)',
        content: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
      },
      maxWidth: {
        app: 'var(--app-max-width)',
      },
      spacing: {
        'safe-top': 'var(--safe-top)',
        'safe-bottom': 'var(--safe-bottom)',
        nav: 'var(--bottom-nav-height)',
        header: 'var(--header-height)',
      },
    },
  },
  plugins: [],
} satisfies Config;
