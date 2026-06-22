import { getStore, stores as staticStores } from '@/lib/stores.config';
import type { StoreTheme } from '@/lib/stores.config';
import { notFound } from 'next/navigation';
import StoreRenderer from './StoreRenderer';
import { supabase } from '@/lib/supabase';
import { Vibrant } from 'node-vibrant/node';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

/** Colores por defecto cuando no hay image ni template reconocido */
const DEFAULT_THEME: StoreTheme = {
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

/** Extrae una paleta de colores de una imagen — igual que hace Sunset pero automático */
async function extractThemeFromImage(imageUrl: string): Promise<StoreTheme | null> {
  try {
    const palette = await Vibrant.from(imageUrl).getPalette();

    const vibrant    = palette.Vibrant?.hex    ?? null;
    const darkVib    = palette.DarkVibrant?.hex ?? null;
    const lightVib   = palette.LightVibrant?.hex ?? null;
    const muted      = palette.Muted?.hex      ?? null;
    const darkMuted  = palette.DarkMuted?.hex  ?? null;
    const lightMuted = palette.LightMuted?.hex ?? null;

    if (!vibrant) return null;

    // Si la imagen es más oscura (como Sunset) → dark theme; si clara → light theme
    const darkPop  = (palette.DarkVibrant?.population  ?? 0) + (palette.DarkMuted?.population  ?? 0);
    const lightPop = (palette.LightVibrant?.population ?? 0) + (palette.LightMuted?.population ?? 0);
    const isDark   = darkPop > lightPop;

    const primary            = vibrant;
    const bg                 = isDark ? (darkVib  ?? '#131313') : (lightVib  ?? '#f9f9ff');
    const surface            = isDark ? (darkMuted ?? '#1c1b1b') : '#ffffff';
    const surfaceContainer   = isDark ? '#201f1f' : (lightMuted ?? '#ecedf7');
    const onBg               = isDark ? '#e5e2e1' : '#191b23';
    const onSurfaceVar       = isDark ? '#c8c3b0' : '#424754';
    const outline            = isDark ? '#4d4645' : '#c2c6d6';

    return {
      primary,
      onPrimary: '#ffffff',
      primaryContainer: muted ?? primary,
      secondary: muted ?? '#545f73',
      secondaryContainer: lightMuted ?? '#d5e0f8',
      background: bg,
      surface,
      surfaceContainer,
      surfaceContainerLow:    isDark ? '#1c1b1b' : '#f2f3fd',
      surfaceContainerLowest: isDark ? '#0e0e0e' : '#ffffff',
      surfaceContainerHigh:   isDark ? '#2a2a2a' : '#e6e7f2',
      onBackground: onBg,
      onSurface: onBg,
      onSurfaceVariant: onSurfaceVar,
      outlineVariant: outline,
      fontHeadline: "'Inter', sans-serif",
      fontBody: "'Inter', sans-serif",
      fontLabel: "'Inter', sans-serif",
    };
  } catch {
    return null;
  }
}

async function getDynamicStore(slug: string) {
  const store = getStore(slug);
  
  try {
    const { data: dbStore } = await supabase
      .from('stores')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
      
    if (dbStore) {
      const heroImage = (() => {
        if (dbStore.hero_image) return dbStore.hero_image;
        const tk = dbStore.template as string;
        if (tk && staticStores[tk]) return staticStores[tk].heroImage;
        if (store) return store.heroImage;
        return 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80';
      })();

      // Resolución de theme en orden de prioridad:
      // 1. Theme personalizado en DB
      // 2. Colores del template seleccionado (sunset, natura, etc.)
      // 3. ✨ Extracción automática de colores de la imagen hero
      // 4. Azul genérico por defecto
      let resolvedTheme: StoreTheme;
      if (dbStore.theme && Object.keys(dbStore.theme).length > 0) {
        resolvedTheme = dbStore.theme;
      } else {
        const templateKey = dbStore.template as string;
        if (templateKey && staticStores[templateKey]) {
          resolvedTheme = staticStores[templateKey].theme;
        } else if (store) {
          resolvedTheme = store.theme;
        } else {
          // Intentar extraer de la imagen
          const extracted = await extractThemeFromImage(heroImage);
          resolvedTheme = extracted ?? DEFAULT_THEME;
        }
      }

      const baseConfig = store || {
        slug: dbStore.slug,
        name: dbStore.name,
        tagline: dbStore.tagline || '',
        marketplaceCategory: dbStore.marketplace_category || 'General',
        template: (dbStore.template || 'default') as any,
        heroImage,
        heroAlt: dbStore.hero_alt || 'store image',
        theme: resolvedTheme,
        categories: dbStore.categories || []
      };
      
      return {
        ...baseConfig,
        name: dbStore.name || baseConfig.name,
        tagline: dbStore.tagline || baseConfig.tagline,
        heroImage,
        logoImage: dbStore.logo_image || undefined,
        marketplaceCategory: dbStore.marketplace_category || baseConfig.marketplaceCategory,
        template: (dbStore.template || baseConfig.template) as any,
        theme: resolvedTheme,
        categories: dbStore.categories || baseConfig.categories
      };
    }
  } catch (err) {
    console.error('Error fetching dynamic store:', err);
  }
  
  return store;
}

export async function generateMetadata({ params }: Omit<Props, 'searchParams'>) {
  const { slug } = await params;
  const store = await getDynamicStore(slug);
  if (!store) return { title: 'Tienda no encontrada' };
  return {
    title: `${store.name} | Boga Market`,
    description: store.tagline,
    manifest: `/manifest.json?slug=${slug}`,
  };
}

export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  let store = await getDynamicStore(slug);
  
  if (!store) {
    if (preview === 'true') {
      const defaultStore = getStore('sunset');
      store = defaultStore || {
        slug: slug,
        name: 'Nueva Tienda',
        tagline: 'Lema de la Tienda',
        marketplaceCategory: 'General',
        template: 'sunset',
        heroImage: 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1200&q=80',
        heroAlt: 'nueva tienda',
        theme: DEFAULT_THEME,
        categories: []
      };
    } else {
      notFound();
    }
  }
  
  return <StoreRenderer store={store} />;
}
