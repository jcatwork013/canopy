import type { AuthTokens } from '../types/auth';
import { ApiError, MemoryTokenStore, type ClientConfig, type TokenStore } from './types';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip Authorization header (auth/system endpoints). */
  anonymous?: boolean;
  /** Skip the auto-refresh-on-401 retry (used by the refresh call itself). */
  noRefresh?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

/**
 * HttpClient is the transport layer shared by web + mobile. It is intentionally
 * free of any platform globals beyond `fetch` (injectable). It handles:
 *  - bearer auth from the TokenStore
 *  - transparent access-token refresh on 401 (single-flight)
 *  - error normalization into ApiError
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly onAuthError?: () => void;
  readonly tokens: TokenStore;

  /** Single-flight refresh promise to avoid stampedes. */
  private refreshing: Promise<AuthTokens | null> | null = null;

  constructor(cfg: ClientConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.fetchImpl = cfg.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.tokens = cfg.tokenStore ?? new MemoryTokenStore();
    this.timeoutMs = cfg.timeoutMs ?? 30_000;
    this.onAuthError = cfg.onAuthError;
  }

  async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const res = await this.send(path, opts);

    if (res.status === 401 && !opts.anonymous && !opts.noRefresh) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        const retry = await this.send(path, opts);
        return this.parse<T>(retry);
      }
      this.onAuthError?.();
    }
    return this.parse<T>(res);
  }

  private async send(path: string, opts: RequestOptions): Promise<Response> {
    const url = this.buildUrl(path, opts.query);
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    if (!opts.anonymous) {
      const t = await this.tokens.get();
      if (t?.access_token) headers['Authorization'] = `Bearer ${t.access_token}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, {
        method: opts.method ?? 'GET',
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: opts.signal ?? controller.signal,
      });
    } catch (err) {
      throw new ApiError(
        'NETWORK_ERROR',
        err instanceof Error ? err.message : 'network request failed',
        0,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async parse<T>(res: Response): Promise<T> {
    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const data = text ? safeJson(text) : undefined;

    if (!res.ok) {
      const body = data as { error?: { code?: string; message?: string; details?: unknown } } | undefined;
      throw new ApiError(
        body?.error?.code ?? 'HTTP_ERROR',
        body?.error?.message ?? res.statusText ?? 'request failed',
        res.status,
        body?.error?.details,
      );
    }
    return data as T;
  }

  /** Single-flight refresh. Returns the new tokens or null on failure. */
  private tryRefresh(): Promise<AuthTokens | null> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      try {
        const current = await this.tokens.get();
        if (!current?.refresh_token) return null;
        const res = await this.send('/auth/refresh', {
          method: 'POST',
          body: { refresh_token: current.refresh_token },
          anonymous: true,
          noRefresh: true,
        });
        if (!res.ok) {
          await this.tokens.set(null);
          return null;
        }
        const next = (await res.json()) as AuthTokens;
        await this.tokens.set(next);
        return next;
      } catch {
        return null;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    if (!query) return url;
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return qs ? `${url}?${qs}` : url;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
