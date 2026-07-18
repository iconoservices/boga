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

export const stores: Record<string, StoreConfig> = {};

export function getStore(slug: string): StoreConfig | null {
  return stores[slug] ?? null;
}

export function getStoreByDomain(domain: string): StoreConfig | null {
  return null;
}
