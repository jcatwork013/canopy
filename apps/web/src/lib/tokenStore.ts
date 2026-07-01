import type { AuthTokens, TokenStore } from '@canopy/shared';

const KEY = 'canopy.tokens';

/**
 * Web implementation of the shared TokenStore using localStorage. The React
 * Native app provides its own (AsyncStorage / SecureStore) — the rest of the
 * client code is identical. This single swap is the crux of RN-readiness.
 */
export class LocalStorageTokenStore implements TokenStore {
  async get(): Promise<AuthTokens | null> {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as AuthTokens) : null;
    } catch {
      return null;
    }
  }

  async set(tokens: AuthTokens | null): Promise<void> {
    if (tokens) localStorage.setItem(KEY, JSON.stringify(tokens));
    else localStorage.removeItem(KEY);
  }
}
