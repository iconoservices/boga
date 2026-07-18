import type { StoreTheme } from '@/lib/templates.config';
export type { StoreTheme } from '@/lib/templates.config';

export const BOGA_DEFAULT_ICON = '/pwa-icon.png';

export interface StoreConfig {
  slug: string;
  name: string;
  tagline: string;
  marketplaceCategory: string;
  template: string;
  theme: StoreTheme;
  heroImage: string;
  heroAlt: string;
  iconImage?: string;
  categories: { name: string; icon: string; href: string }[];
  logoImage?: string;
  domain?: string;
  /** Numero al que llegan los pedidos, con codigo de pais y sin signos: 51987654321 */
  whatsapp?: string;
}

// Las tiendas viven en Supabase, no aca. Cada consumidor las carga por su lado:
// la tienda publica en app/[slug]/page.tsx, el panel en app/admin/page.tsx.
