import type { StoreTheme } from '@/lib/templates.config';
export type { StoreTheme } from '@/lib/templates.config';

export interface StoreConfig {
  slug: string;
  name: string;
  tagline: string;
  marketplaceCategory: string;
  template: string;
  theme: StoreTheme;
  heroImage: string;
  heroAlt: string;
  categories: { name: string; icon: string; href: string }[];
  logoImage?: string;
  domain?: string;
}

export const stores: Record<string, StoreConfig> = {};

export function getStore(slug: string): StoreConfig | null {
  return stores[slug] ?? null;
}

export function getStoreByDomain(domain: string): StoreConfig | null {
  return null;
}
