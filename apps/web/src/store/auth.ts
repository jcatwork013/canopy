import type { User } from '@canopy/shared';
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  setHydrated: (v: boolean) => void;
  clear: () => void;
}

/** Session/auth store. Tokens live in the API client's TokenStore, not here. */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  setHydrated: (hydrated) => set({ hydrated }),
  clear: () => set({ user: null }),
}));
