import type { SiteConfig } from '@canopy/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const DEFAULT_HERO = [
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1920&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1459156212016-c812468e2115?w=1920&q=80&auto=format&fit=crop',
];

/** Public website settings (hero images, tagline, contact phone) with fallbacks. */
export function useSiteConfig() {
  const q = useQuery<SiteConfig>({
    queryKey: ['system', 'site'],
    queryFn: () => api.system.site(),
    staleTime: 60_000,
    retry: 1,
  });

  const heroImages = q.data?.hero_images?.length ? q.data.hero_images : DEFAULT_HERO;
  return {
    heroImages,
    tagline: q.data?.tagline || '',
    contactPhone: q.data?.contact_phone || '',
  };
}
