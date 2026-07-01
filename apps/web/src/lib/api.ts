import { CanopyClient } from '@canopy/shared';
import { useAuthStore } from '@/store/auth';
import { LocalStorageTokenStore } from './tokenStore';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/**
 * The app-wide API client. Identical construction on React Native, except the
 * TokenStore implementation. onAuthError clears auth state so the UI redirects
 * to login when a refresh ultimately fails.
 */
export const api = new CanopyClient({
  baseUrl,
  tokenStore: new LocalStorageTokenStore(),
  onAuthError: () => {
    useAuthStore.getState().clear();
  },
});
