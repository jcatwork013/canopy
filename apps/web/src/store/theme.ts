import { create } from 'zustand';

export type Theme = 'system' | 'light' | 'dark';

const KEY = 'canopy-theme';

/** Reflect the theme onto <html>. 'system' clears the attribute so the
 *  prefers-color-scheme media query governs. */
function apply(theme: Theme) {
  const el = document.documentElement;
  if (theme === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', theme);
}

function initial(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

/** Light/dark/system theme with localStorage persistence. The index.html boot
 *  script applies the stored value before paint; this store owns changes. */
export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial(),
  setTheme: (theme) => {
    apply(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },
}));
