import type { AuthTokens } from '../types/auth';

/** Standardized API error envelope: { error: { code, message } }. */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** Thrown by the client for any non-2xx response (or network failure). */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** True when the server reports the activation gate is closed. */
  get isSystemNotReady(): boolean {
    return this.code === 'SYSTEM_NOT_READY' || this.status === 503;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

/**
 * Persisted token storage. Web implements this with localStorage; React Native
 * with AsyncStorage / SecureStore. Methods are async to fit both.
 */
export interface TokenStore {
  get(): Promise<AuthTokens | null>;
  set(tokens: AuthTokens | null): Promise<void>;
}

/** In-memory token store — fine for SSR/tests; not persisted. */
export class MemoryTokenStore implements TokenStore {
  private tokens: AuthTokens | null = null;
  async get() {
    return this.tokens;
  }
  async set(tokens: AuthTokens | null) {
    this.tokens = tokens;
  }
}

export interface ClientConfig {
  /** e.g. http://localhost:8080/api/v1 */
  baseUrl: string;
  /** Defaults to the global fetch (browser, RN, Node 18+). */
  fetchImpl?: typeof fetch;
  /** Token persistence. Defaults to in-memory. */
  tokenStore?: TokenStore;
  /** Called when refresh fails and the session is unrecoverable. */
  onAuthError?: () => void;
  /** Per-request timeout in ms (default 30s). */
  timeoutMs?: number;
}
