import type { AIProviderType } from '@canopy/shared';

export interface ProviderMeta {
  type: AIProviderType;
  label: string;
  /** Display name stored on the provider row. */
  providerName: string;
  keyPlaceholder: string;
  keyHint: string;
  docsUrl: string;
  /**
   * Model IDs ordered best → cheapest, as of the editorial snapshot below.
   * This only *ranks* models; the live list returned by the key is the source
   * of truth, so a newer model the key exposes still wins if we can't match.
   */
  priority: string[];
  /** Fallback when a key hasn't been verified yet. */
  defaultModel: string;
}

// Editorial snapshot — update as vendors ship newer flagships. The picker always
// reconciles this against the models the admin's key actually returns.
export const AI_PROVIDERS: Record<AIProviderType, ProviderMeta> = {
  gemini: {
    type: 'gemini',
    label: 'Google Gemini',
    providerName: 'Gemini',
    keyPlaceholder: 'AIza…',
    keyHint: 'Lấy key tại Google AI Studio.',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    priority: ['gemini-3-pro', 'gemini-3-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
    defaultModel: 'gemini-2.5-flash',
  },
  openai: {
    type: 'openai',
    label: 'OpenAI',
    providerName: 'OpenAI',
    keyPlaceholder: 'sk-…',
    keyHint: 'Lấy key tại platform.openai.com → API keys.',
    docsUrl: 'https://platform.openai.com/api-keys',
    priority: ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o', 'o4-mini'],
    defaultModel: 'gpt-4.1',
  },
};

export const PROVIDER_TYPES: AIProviderType[] = ['gemini', 'openai'];

/**
 * Score a model for "best" ranking — higher wins. Version-aware, so a newer
 * flagship the key exposes (e.g. gemini-3.1-pro) automatically beats an older
 * one (gemini-2.5-pro) WITHOUT editing this file. Tier (pro > flash > lite) and
 * GA-over-preview break ties within the same version.
 */
export function scoreModel(type: AIProviderType, id: string): number {
  const m = id.toLowerCase();
  if (type === 'gemini') {
    const ver = parseVersion(m, /gemini-(\d+)(?:\.(\d+))?/);
    const tier = m.includes('flash-lite') ? 1 : m.includes('flash') ? 2 : m.includes('pro') ? 3 : 0;
    const stable = /(exp|preview|thinking)/.test(m) ? 0 : 1;
    const small = m.includes('-8b') ? -1 : 0;
    return ver * 1000 + tier * 100 + stable * 10 + small;
  }
  // openai — treat the o-series as flagship reasoning; gpt-N by version.
  const oSeries = /^o(\d+)/.exec(m);
  const base = oSeries ? 50 + Number(oSeries[1]) : parseVersion(m, /gpt-(\d+)(?:\.(\d+))?/);
  const tier = m.includes('nano') ? 1 : m.includes('mini') ? 2 : 3;
  const stable = /(preview|exp)/.test(m) ? 0 : 1;
  return base * 1000 + tier * 100 + stable * 10;
}

// "3.1" -> 301, "2.5" -> 205. Missing minor counts as 0.
function parseVersion(s: string, re: RegExp): number {
  const mm = re.exec(s);
  if (!mm) return 0;
  return Number(mm[1] ?? 0) * 100 + Number(mm[2] ?? 0);
}

/**
 * Pick the best model the key exposes (highest score). Falls back to the catalog
 * default before a key is verified (no live list yet).
 */
export function pickBestModel(meta: ProviderMeta, live: string[]): string {
  if (live.length === 0) return meta.priority[0] ?? meta.defaultModel;
  return [...live].sort((a, b) => scoreModel(meta.type, b) - scoreModel(meta.type, a))[0] ?? meta.defaultModel;
}

/** Models to show in the picker: live (if verified) ranked best-first, else the
 *  catalog snapshot; the current value is always kept selectable. */
export function modelOptions(meta: ProviderMeta, live: string[], current: string): string[] {
  const ranked = live.length
    ? [...live].sort((a, b) => scoreModel(meta.type, b) - scoreModel(meta.type, a))
    : [...meta.priority];
  const out = [...ranked];
  if (current && !out.includes(current)) out.unshift(current);
  return out;
}
