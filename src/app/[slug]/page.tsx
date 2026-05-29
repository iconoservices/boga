import { getStore, stores as staticStores } from '@/lib/stores.config';
import { notFound } from 'next/navigation';
import StoreRenderer from './StoreRenderer';
import { supabase } from '@/lib/supabase';

interface Props {
  params: Promise<{ slug: string }>;
}

/** Colores por defecto cuando no hay theme ni template reconocido */
const DEFAULT_THEME = {
  primary: '#0058be',
  onPrimary: '#ffffff',
  primaryContainer: '#2170e4',
  secondary: '#545f73',
  secondaryContainer: '#d5e0f8',
  background: '#f9f9ff',
  surface: '#ffffff',
  surfaceContainer: '#ecedf7',
  surfaceContainerLow: '#f2f3fd',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerHigh: '#e6e7f2',
  onBackground: '#191b23',
  onSurface: '#191b23',
  onSurfaceVariant: '#424754',
  outlineVariant: '#c2c6d6',
  fontHeadline: "'Inter', sans-serif",
  fontBody: "'Inter', sans-serif",
  fontLabel: "'Inter', sans-serif",
};

async function getDynamicStore(slug: string) {
  const store = getStore(slug);
  
  try {
    const { data: dbStore } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
      
    if (dbStore) {
      // 1. Si la DB tiene theme personalizado → úsalo
      // 2. Si tiene template reconocido → usa los colores de ese template
      // 3. Si nada → usa el azul default
      const resolveTheme = () => {
        if (dbStore.theme && Object.keys(dbStore.theme).length > 0) return dbStore.theme;
        const templateKey = dbStore.template as string;
        if (templateKey && staticStores[templateKey]) return staticStores[templateKey].theme;
        if (store) return store.theme;
        return DEFAULT_THEME;
      };

      const resolveHeroImage = () => {
        if (dbStore.hero_image) return dbStore.hero_image;
        const templateKey = dbStore.template as string;
        if (templateKey && staticStores[templateKey]) return staticStores[templateKey].heroImage;
        if (store) return store.heroImage;
        return 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80';
      };

      const baseConfig = store || {
        slug: dbStore.slug,
        name: dbStore.name,
        tagline: dbStore.tagline || '',
        marketplaceCategory: dbStore.marketplace_category || 'General',
        template: (dbStore.template || 'default') as any,
        heroImage: resolveHeroImage(),
        heroAlt: dbStore.hero_alt || 'store image',
        theme: resolveTheme(),
        categories: dbStore.categories || []
      };
      
      return {
        ...baseConfig,
        name: dbStore.name || baseConfig.name,
        tagline: dbStore.tagline || baseConfig.tagline,
        heroImage: resolveHeroImage(),
        logoImage: dbStore.logo_image || undefined,
        marketplaceCategory: dbStore.marketplace_category || baseConfig.marketplaceCategory,
        template: (dbStore.template || baseConfig.template) as any,
        theme: resolveTheme(),
        categories: dbStore.categories || baseConfig.categories
      };
    }
  } catch (err) {
    console.error('Error fetching dynamic store:', err);
  }
  
  return store;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const store = await getDynamicStore(slug);
  if (!store) return { title: 'Tienda no encontrada' };
  return {
    title: `${store.name} | Boga Market`,
    description: store.tagline,
  };
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params;
  const store = await getDynamicStore(slug);
  if (!store) notFound();
  return <StoreRenderer store={store} />;
}
