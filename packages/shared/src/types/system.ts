/** Readiness check for a single subsystem (mirrors Go internal/system.Check). */
export interface ReadinessCheck {
  ok: boolean;
  detail?: string;
}

/** GET /system/status — the activation gate snapshot. */
export interface SystemStatus {
  ready: boolean;
  version: string;
  missing: string[];
  checks: Record<string, ReadinessCheck>;
  checked_at: string;
}

/** GET /system/site — admin-editable public website settings. */
export interface SiteConfig {
  tagline: string;
  contact_phone: string;
  hero_images: string[] | null;
}

/** A gardening article aggregated from public RSS (cẩm nang cây). */
export interface GuideArticle {
  title: string;
  link: string;
  summary: string;
  image: string;
  source: string;
  published: string;
}
